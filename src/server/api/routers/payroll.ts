import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";

export const payrollRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.payrollRun.findMany({
      where: { companyId: ctx.user.companyId },
      include: {
        records: { include: { employee: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.prisma.payrollRun.findFirst({
      where: { id: input, companyId: ctx.user.companyId },
      include: {
        records: { include: { employee: true } },
        salaryAdvances: { include: { employee: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        periodMonth: z.number().int().min(1).max(12),
        periodYear: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const employees = await ctx.prisma.employee.findMany({
        where: { companyId: ctx.user.companyId, status: "ACTIVE" },
      });

      const existing = await ctx.prisma.payrollRun.findFirst({
        where: {
          companyId: ctx.user.companyId,
          periodMonth: input.periodMonth,
          periodYear: input.periodYear,
        },
      });

      if (existing) {
        throw new Error("Une campagne de paie existe déjà pour cette période");
      }

      const payrollRun = await ctx.prisma.payrollRun.create({
        data: {
          companyId: ctx.user.companyId,
          periodMonth: input.periodMonth,
          periodYear: input.periodYear,
          processedBy: ctx.user.id,
        },
      });

      for (const emp of employees) {
        const advances = await ctx.prisma.salaryAdvance.findMany({
          where: {
            employeeId: emp.id,
            status: "APPROVED",
            appliedInPayrollId: null,
          },
        });

        const totalAdvanceAmount = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        const netSalary = Number(emp.baseSalary) - totalAdvanceAmount;

        await ctx.prisma.payrollRecord.create({
          data: {
            payrollRunId: payrollRun.id,
            employeeId: emp.id,
            baseSalary: emp.baseSalary,
            totalAdvances: totalAdvanceAmount,
            netSalary: netSalary < 0 ? 0 : netSalary,
            deductions: 0,
          },
        });

        if (advances.length > 0) {
          await ctx.prisma.salaryAdvance.updateMany({
            where: { id: { in: advances.map((a) => a.id) } },
            data: { appliedInPayrollId: payrollRun.id, status: "PAID" },
          });
        }
      }

      const records = await ctx.prisma.payrollRecord.findMany({
        where: { payrollRunId: payrollRun.id },
      });

      const totalAmount = records.reduce((sum, r) => sum + Number(r.netSalary), 0);

      await ctx.prisma.payrollRun.update({
        where: { id: payrollRun.id },
        data: { totalAmount },
      });

      return ctx.prisma.payrollRun.findFirst({
        where: { id: payrollRun.id },
        include: { records: { include: { employee: true } } },
      });
    }),

  approve: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.payrollRun.update({
      where: { id: input, companyId: ctx.user.companyId },
      data: { status: "APPROVED" },
    });
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.payrollRun.update({
      where: { id: input, companyId: ctx.user.companyId },
      data: { status: "PAID" },
    });
  }),
});
