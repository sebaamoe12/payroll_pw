import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";
import type { PayrollRun, PayrollRecord, Employee, SalaryAdvance } from "@/server/db/types";

type PayrollRunWithRecords = PayrollRun & {
  records: (PayrollRecord & { employee: Employee })[];
  salaryAdvances?: (SalaryAdvance & { employee: Employee })[];
};

export const payrollRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.query<PayrollRun>(
      'SELECT * FROM "PayrollRun" WHERE "companyId" = $1 ORDER BY "periodYear" DESC, "periodMonth" DESC',
      [ctx.user.companyId]
    );
    const records = await ctx.query<PayrollRecord & { employee: Employee }>(
      `SELECT pr.*,
        (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = pr."employeeId") as employee
      FROM "PayrollRecord" pr
      WHERE pr."payrollRunId" = ANY($1::text[])
      ORDER BY pr."createdAt"`,
      [rows.map(r => r.id)]
    );
    const recordsByRunId: Record<string, any[]> = {};
    for (const r of records) {
      if (!recordsByRunId[r.payrollRunId]) recordsByRunId[r.payrollRunId] = [];
      recordsByRunId[r.payrollRunId].push(r);
    }
    return rows.map(r => ({ ...r, records: recordsByRunId[r.id] ?? [] }));
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const run = await ctx.queryOne<PayrollRun>(
      'SELECT * FROM "PayrollRun" WHERE id = $1 AND "companyId" = $2',
      [input, ctx.user.companyId]
    );
    if (!run) return null;
    const records = await ctx.query<PayrollRecord & { employee: Employee }>(
      `SELECT pr.*,
        (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = pr."employeeId") as employee
      FROM "PayrollRecord" pr WHERE pr."payrollRunId" = $1`,
      [input]
    );
    const salaryAdvances = await ctx.query<SalaryAdvance & { employee: Employee }>(
      `SELECT sa.*,
        (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = sa."employeeId") as employee
      FROM "SalaryAdvance" sa WHERE sa."appliedInPayrollId" = $1`,
      [input]
    );
    return { ...run, records, salaryAdvances } as PayrollRunWithRecords;
  }),

  create: adminProcedure
    .input(
      z.object({
        periodMonth: z.number().int().min(1).max(12),
        periodYear: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const employees = await ctx.query<Employee>(
        'SELECT * FROM "Employee" WHERE "companyId" = $1 AND status = $2',
        [ctx.user.companyId, "ACTIVE"]
      );

      const existing = await ctx.queryOne<PayrollRun>(
        'SELECT * FROM "PayrollRun" WHERE "companyId" = $1 AND "periodMonth" = $2 AND "periodYear" = $3',
        [ctx.user.companyId, input.periodMonth, input.periodYear]
      );

      if (existing) {
        throw new Error("Une campagne de paie existe déjà pour cette période");
      }

      const runId = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await ctx.query(
        `INSERT INTO "PayrollRun" (id, "companyId", "periodMonth", "periodYear", "processedBy")
         VALUES ($1, $2, $3, $4, $5)`,
        [runId, ctx.user.companyId, input.periodMonth, input.periodYear, ctx.user.id]
      );

      let totalAmount = 0;
      for (const emp of employees) {
        const advances = await ctx.query<SalaryAdvance>(
          'SELECT * FROM "SalaryAdvance" WHERE "employeeId" = $1 AND status = $2 AND "appliedInPayrollId" IS NULL',
          [emp.id, "APPROVED"]
        );

        const totalAdvanceAmount = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        const netSalary = Number(emp.baseSalary) - totalAdvanceAmount;

        await ctx.query(
          `INSERT INTO "PayrollRecord" (id, "payrollRunId", "employeeId", "baseSalary", "totalAdvances", "netSalary")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            `prr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            runId, emp.id, emp.baseSalary, totalAdvanceAmount,
            netSalary < 0 ? 0 : netSalary
          ]
        );

        if (advances.length > 0) {
          await ctx.query(
            `UPDATE "SalaryAdvance" SET "appliedInPayrollId" = $1, status = 'PAID' WHERE id = ANY($2::text[])`,
            [runId, advances.map(a => a.id)]
          );
        }

        totalAmount += netSalary < 0 ? 0 : netSalary;
      }

      await ctx.query(
        'UPDATE "PayrollRun" SET "totalAmount" = $1 WHERE id = $2',
        [totalAmount, runId]
      );

      const records = await ctx.query<PayrollRecord & { employee: Employee }>(
        `SELECT pr.*,
          (SELECT row_to_json(e.*) FROM "Employee" e WHERE e.id = pr."employeeId") as employee
        FROM "PayrollRecord" pr WHERE pr."payrollRunId" = $1`,
        [runId]
      );

      const run = await ctx.queryOne<PayrollRun>('SELECT * FROM "PayrollRun" WHERE id = $1', [runId]);
      return { ...run, records } as PayrollRunWithRecords;
    }),

  approve: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<PayrollRun>(
      'UPDATE "PayrollRun" SET status = $1 WHERE id = $2 AND "companyId" = $3 RETURNING *',
      ["APPROVED", input, ctx.user.companyId]
    );
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.queryOne<PayrollRun>(
      'UPDATE "PayrollRun" SET status = $1 WHERE id = $2 AND "companyId" = $3 RETURNING *',
      ["PAID", input, ctx.user.companyId]
    );
  }),
});
