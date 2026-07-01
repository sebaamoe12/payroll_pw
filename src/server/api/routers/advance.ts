import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";
import type { SalaryAdvance, Employee, User } from "@/server/db/types";

type AdvanceWithRelations = SalaryAdvance & {
  employee: Employee;
  approvedBy: Pick<User, "id" | "name" | "email"> | null;
};

export const advanceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.query<AdvanceWithRelations>(
      `SELECT sa.*,
        (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = sa."employeeId") as employee,
        (SELECT CASE WHEN sa."approvedById" IS NOT NULL THEN
          json_build_object('id', u.id, 'name', u.name, 'email', u.email)
        END FROM "User" u WHERE u.id = sa."approvedById") as "approvedBy"
      FROM "SalaryAdvance" sa
      WHERE sa."companyId" = $1
      ORDER BY sa."createdAt" DESC`,
      [ctx.user.companyId]
    );
    return rows;
  }),

  create: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        amount: z.number().positive(),
        reason: z.string().optional(),
        date: z.string(),
        type: z.enum(["SALARY", "EMERGENCY", "MEDICAL", "OTHER"]).default("SALARY"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = `adv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return ctx.queryOne<SalaryAdvance>(
        `INSERT INTO "SalaryAdvance" (id, "employeeId", amount, reason, date, type, "companyId")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          id, input.employeeId, input.amount, input.reason ?? null,
          new Date(input.date).toISOString(), input.type, ctx.user.companyId
        ]
      );
    }),

  approve: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<SalaryAdvance>(
      `UPDATE "SalaryAdvance" SET status = 'APPROVED', "approvedById" = $1, "approvedAt" = $2 WHERE id = $3 RETURNING *`,
      [ctx.user.id, new Date().toISOString(), input]
    );
  }),

  reject: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<SalaryAdvance>(
      `UPDATE "SalaryAdvance" SET status = 'REJECTED', "approvedById" = $1, "approvedAt" = $2 WHERE id = $3 RETURNING *`,
      [ctx.user.id, new Date().toISOString(), input]
    );
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<SalaryAdvance>(
      `UPDATE "SalaryAdvance" SET status = 'PAID' WHERE id = $1 RETURNING *`,
      [input]
    );
  }),
});
