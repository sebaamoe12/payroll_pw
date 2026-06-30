import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";

export const employeePayrollRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.employeePayroll.findMany({
      where: { companyId: ctx.user.companyId },
      include: { employee: true, paidBy: { select: { id: true, name: true, email: true } } },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
  }),

  getByEmployee: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.prisma.employeePayroll.findMany({
      where: { employeeId: input, companyId: ctx.user.companyId },
      include: { salaryAdvances: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.employeePayroll.update({
      where: { id: input },
      data: { status: "PAID", paidById: ctx.user.id, paidAt: new Date() },
    });
  }),
});
