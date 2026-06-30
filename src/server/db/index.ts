import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.POSTGRES_URL
    ?? "";
}

export function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  const isSupabase = url.includes("supabase");
  const pool = new Pool({
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
  const adapter = new PrismaPg(pool as never);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
