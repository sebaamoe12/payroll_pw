import { z } from "zod";
import { router, protectedProcedure } from "../middleware";

export const reportRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [employees, activeEmployees, advances, payrollRuns, employeePayrolls] = await Promise.all([
      ctx.prisma.employee.count({ where: { companyId: ctx.user.companyId } }),
      ctx.prisma.employee.count({ where: { companyId: ctx.user.companyId, status: "ACTIVE" } }),
      ctx.prisma.salaryAdvance.findMany({
        where: { companyId: ctx.user.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      ctx.prisma.payrollRun.findMany({
        where: { companyId: ctx.user.companyId },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 6,
      }),
      ctx.prisma.employeePayroll.aggregate({
        where: { companyId: ctx.user.companyId },
        _sum: { totalAdvances: true, netSalary: true, deductions: true },
      }),
    ]);

    return {
      employees,
      activeEmployees,
      recentAdvances: advances,
      recentPayrollRuns: payrollRuns,
      totals: {
        advances: Number(employeePayrolls._sum.totalAdvances ?? 0),
        netSalary: Number(employeePayrolls._sum.netSalary ?? 0),
        deductions: Number(employeePayrolls._sum.deductions ?? 0),
      },
    };
  }),

  monthly: protectedProcedure
    .input(z.object({ month: z.number().int().min(1).max(12), year: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [employees, advances, payrollRecords] = await Promise.all([
        ctx.prisma.employee.findMany({
          where: { companyId: ctx.user.companyId, status: "ACTIVE" },
        }),
        ctx.prisma.salaryAdvance.findMany({
          where: {
            companyId: ctx.user.companyId,
            date: {
              gte: new Date(input.year, input.month - 1, 1),
              lt: new Date(input.year, input.month, 1),
            },
          },
          include: { employee: true },
        }),
        ctx.prisma.payrollRecord.findMany({
          where: {
            payrollRun: {
              companyId: ctx.user.companyId,
              periodMonth: input.month,
              periodYear: input.year,
            },
          },
          include: { employee: true },
        }),
      ]);

      return { employees, advances, payrollRecords };
    }),
});
