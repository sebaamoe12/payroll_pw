import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getAuth } from "../auth";
import prisma from "../db";

export async function createTRPCContext() {
  const session = await getAuth();
  return { prisma, session };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, user: ctx.session.user as { id: string; email: string; role: string; companyId: string } },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
