import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";
import type { Employee } from "@/server/db/types";

export const employeeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.query<Employee>(
      'SELECT * FROM "Employee" WHERE "companyId" = $1 ORDER BY "createdAt" DESC',
      [ctx.user.companyId]
    );
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.queryOne<Employee>(
      'SELECT * FROM "Employee" WHERE id = $1 AND "companyId" = $2',
      [input, ctx.user.companyId]
    );
  }),

  create: adminProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        position: z.string().min(1),
        baseSalary: z.number().positive(),
        startDate: z.string(),
        phone: z.string().optional(),
        monthlyAdvanceLimit: z.number().positive().default(50000),
        payDay: z.number().int().min(1).max(31).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return ctx.queryOne<Employee>(
        `INSERT INTO "Employee" (id, "firstName", "lastName", email, position, "baseSalary", "startDate", phone, "monthlyAdvanceLimit", "payDay", "companyId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          id, input.firstName, input.lastName, input.email ?? null,
          input.position, input.baseSalary, new Date(input.startDate).toISOString(),
          input.phone ?? null, input.monthlyAdvanceLimit ?? 50000, input.payDay ?? 1,
          ctx.user.companyId
        ]
      );
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional().nullable(),
        position: z.string().min(1).optional(),
        baseSalary: z.number().positive().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        phone: z.string().optional().nullable(),
        monthlyAdvanceLimit: z.number().positive().optional(),
        payDay: z.number().int().min(1).max(31).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updates: string[] = [];
      const params: any[] = [];
      let idx = 1;
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        if (key === "baseSalary" || key === "monthlyAdvanceLimit") {
          updates.push(`"${key}" = $${idx}`);
          params.push(value);
        } else if (key === "phone" || key === "email") {
          updates.push(`"${key}" = $${idx}`);
          params.push(value ?? null);
        } else {
          updates.push(`"${key}" = $${idx}`);
          params.push(value);
        }
        idx++;
      }
      if (updates.length === 0) return ctx.queryOne<Employee>('SELECT * FROM "Employee" WHERE id = $1', [id]);
      params.push(id, ctx.user.companyId);
      return ctx.queryOne<Employee>(
        `UPDATE "Employee" SET ${updates.join(", ")} WHERE id = $${idx} AND "companyId" = $${idx + 1} RETURNING *`,
        params
      );
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    await ctx.query('DELETE FROM "Employee" WHERE id = $1 AND "companyId" = $2', [input, ctx.user.companyId]);
    return { success: true };
  }),
});
