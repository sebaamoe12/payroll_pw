import { z } from "zod";
import { router, protectedProcedure } from "../middleware";
import type { Employee, SalaryAdvance, PayrollRun, PayrollRecord } from "@/server/db/types";

export const reportRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [empCountResult, activeCountResult, advances, payrollRuns, epAgg] = await Promise.all([
      ctx.query<{ count: string }>('SELECT COUNT(*) as count FROM "Employee" WHERE "companyId" = $1', [ctx.user.companyId]),
      ctx.query<{ count: string }>('SELECT COUNT(*) as count FROM "Employee" WHERE "companyId" = $1 AND status = $2', [ctx.user.companyId, "ACTIVE"]),
      ctx.query<SalaryAdvance>(
        'SELECT * FROM "SalaryAdvance" WHERE "companyId" = $1 ORDER BY "createdAt" DESC LIMIT 10',
        [ctx.user.companyId]
      ),
      ctx.query<PayrollRun>(
        'SELECT * FROM "PayrollRun" WHERE "companyId" = $1 ORDER BY "periodYear" DESC, "periodMonth" DESC LIMIT 6',
        [ctx.user.companyId]
      ),
      ctx.query<{ total_advances: string | null; net_salary: string | null; deductions: string | null }>(
        `SELECT COALESCE(SUM("totalAdvances"), 0) as total_advances,
                COALESCE(SUM("netSalary"), 0) as net_salary,
                COALESCE(SUM(deductions), 0) as deductions
         FROM "EmployeePayroll" WHERE "companyId" = $1`,
        [ctx.user.companyId]
      ),
    ]);

    return {
      employees: parseInt(empCountResult[0]?.count ?? "0", 10),
      activeEmployees: parseInt(activeCountResult[0]?.count ?? "0", 10),
      recentAdvances: advances,
      recentPayrollRuns: payrollRuns,
      totals: {
        advances: parseFloat(epAgg[0]?.total_advances ?? "0"),
        netSalary: parseFloat(epAgg[0]?.net_salary ?? "0"),
        deductions: parseFloat(epAgg[0]?.deductions ?? "0"),
      },
    };
  }),

  monthly: protectedProcedure
    .input(z.object({ month: z.number().int().min(1).max(12), year: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1).toISOString();
      const endDate = new Date(input.year, input.month, 1).toISOString();

      const [employees, advances, payrollRecords] = await Promise.all([
        ctx.query<Employee>(
          'SELECT * FROM "Employee" WHERE "companyId" = $1 AND status = $2',
          [ctx.user.companyId, "ACTIVE"]
        ),
        ctx.query<SalaryAdvance & { employee: Employee }>(
          `SELECT sa.*,
            (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = sa."employeeId") as employee
          FROM "SalaryAdvance" sa
          WHERE sa."companyId" = $1 AND sa.date >= $2 AND sa.date < $3`,
          [ctx.user.companyId, startDate, endDate]
        ),
        ctx.query<PayrollRecord & { employee: Employee }>(
          `SELECT pr.*,
            (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = pr."employeeId") as employee
          FROM "PayrollRecord" pr
          JOIN "PayrollRun" p ON p.id = pr."payrollRunId"
          WHERE p."companyId" = $1 AND p."periodMonth" = $2 AND p."periodYear" = $3`,
          [ctx.user.companyId, input.month, input.year]
        ),
      ]);

      return { employees, advances, payrollRecords };
    }),
});
