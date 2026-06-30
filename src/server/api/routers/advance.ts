import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";

export const advanceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.salaryAdvance.findMany({
      where: { companyId: ctx.user.companyId },
      include: { employee: true, approvedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
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
      return ctx.prisma.salaryAdvance.create({
        data: {
          employeeId: input.employeeId,
          amount: input.amount,
          reason: input.reason,
          date: new Date(input.date),
          type: input.type,
          companyId: ctx.user.companyId,
        },
      });
    }),

  approve: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.salaryAdvance.update({
      where: { id: input },
      data: { status: "APPROVED", approvedById: ctx.user.id, approvedAt: new Date() },
    });
  }),

  reject: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.salaryAdvance.update({
      where: { id: input },
      data: { status: "REJECTED", approvedById: ctx.user.id, approvedAt: new Date() },
    });
  }),

  pay: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.salaryAdvance.update({
      where: { id: input },
      data: { status: "PAID" },
    });
  }),
});
