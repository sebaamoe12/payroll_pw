import { Pool } from "pg";

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL
    ?? process.env.DIRECT_URL
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.POSTGRES_URL
    ?? "";
}

const globalForPool = globalThis as unknown as { pool: Pool | undefined };

function createPool(): Pool {
  const url = getDatabaseUrl();
  return new Pool({
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    ...(url.includes("supabase") ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export const pool = globalForPool.pool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}
