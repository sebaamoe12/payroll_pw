import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../middleware";

export const employeeRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.employee.findMany({
      where: { companyId: ctx.user.companyId },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: protectedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.prisma.employee.findFirst({
      where: { id: input, companyId: ctx.user.companyId },
    });
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
      return ctx.prisma.employee.create({
        data: {
          ...input,
          baseSalary: input.baseSalary,
          monthlyAdvanceLimit: input.monthlyAdvanceLimit ?? 50000,
          startDate: new Date(input.startDate),
          companyId: ctx.user.companyId,
        },
      });
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
      return ctx.prisma.employee.update({
        where: { id, companyId: ctx.user.companyId },
        data: {
          ...data,
          ...(data.baseSalary ? { baseSalary: data.baseSalary } : {}),
          ...(data.monthlyAdvanceLimit ? { monthlyAdvanceLimit: data.monthlyAdvanceLimit } : {}),
        },
      });
    }),

  delete: adminProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.prisma.employee.delete({
      where: { id: input, companyId: ctx.user.companyId },
    });
  }),
});
