import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";
import type { EmployeePayroll, Employee, User, SalaryAdvance } from "@/server/db/types";

type EmployeePayrollWithRelations = EmployeePayroll & {
  employee: Employee;
  paidBy: Pick<User, "id" | "name" | "email"> | null;
};

export const employeePayrollRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.query<EmployeePayrollWithRelations>(
      `SELECT ep.*,
        (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = ep."employeeId") as employee,
        (SELECT CASE WHEN ep."paidById" IS NOT NULL THEN
          json_build_object('id', u.id, 'name', u.name, 'email', u.email)
        END FROM "User" u WHERE u.id = ep."paidById") as "paidBy"
      FROM "EmployeePayroll" ep
      WHERE ep."companyId" = $1
      ORDER BY ep."periodYear" DESC, ep."periodMonth" DESC`,
      [ctx.user.companyId]
    );
  }),

  getByEmployee: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.query<EmployeePayroll & { salaryAdvances: SalaryAdvance[] }>(
      `SELECT ep.*,
        (SELECT COALESCE(json_agg(sa.*) FILTER (WHERE sa.id IS NOT NULL), '[]'::json) FROM "SalaryAdvance" sa WHERE sa."appliedInEmployeePayrollId" = ep.id) as "salaryAdvances"
      FROM "EmployeePayroll" ep
      WHERE ep."employeeId" = $1 AND ep."companyId" = $2
      ORDER BY ep."periodYear" DESC, ep."periodMonth" DESC`,
      [input, ctx.user.companyId]
    );
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<EmployeePayroll>(
      `UPDATE "EmployeePayroll" SET status = 'PAID', "paidById" = $1, "paidAt" = $2 WHERE id = $3 RETURNING *`,
      [ctx.user.id, new Date().toISOString(), input]
    );
  }),
});
