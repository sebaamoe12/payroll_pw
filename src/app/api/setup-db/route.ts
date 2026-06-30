import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

/**
 * POST /api/setup-db
 * One-time endpoint to run migrate.sql against the Supabase database.
 * Requires SETUP_KEY env var and matching x-setup-key header.
 */
export async function POST(request: Request) {
  try {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return NextResponse.json({ error: "SETUP_KEY not configured" }, { status: 500 });
    }

    const headerKey = request.headers.get("x-setup-key");
    if (headerKey !== setupKey) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }

    const dbUrl = process.env.DATABASE_URL
      ?? process.env.POSTGRES_URL_NON_POOLING
      ?? process.env.POSTGRES_PRISMA_URL
      ?? process.env.POSTGRES_URL;

    if (!dbUrl) {
      return NextResponse.json({ error: "No database URL configured" }, { status: 500 });
    }

    const migrateSql = fs.readFileSync(
      path.join(process.cwd(), "migrate.sql"),
      "utf-8"
    );

    const pool = new Pool({
      connectionString: dbUrl,
      max: 1,
      connectionTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    });

    const result = await pool.query(migrateSql);
    await pool.end();

    const cmds = Array.isArray(result) ? result.length : 1;
    return NextResponse.json({
      success: true,
      message: "Migration executed successfully",
      commands: cmds,
    });
  } catch (error) {
    console.error("Setup-db error:", error);
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
