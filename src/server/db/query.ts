import { pool } from "./pool";

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(sql, params);
  return (result.rows[0] as T) ?? null;
}
