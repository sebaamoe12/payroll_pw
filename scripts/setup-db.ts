import "dotenv/config";
import fs from "fs";
import path from "path";
import dns from "dns";
import { Pool } from "pg";

async function resolveHost(url: string): Promise<string> {
  const match = url.match(/@([^:]+):(\d+)\/(.+)/);
  if (!match) return url;
  const [, host, port, db] = match;
  return new Promise((resolve) => {
    dns.resolve6(host, (err, addrs) => {
      if (err || !addrs?.length) {
        console.log(`DNS AAAA failed for ${host}, trying A...`);
        dns.resolve4(host, (err2, addrs4) => {
          if (err2 || !addrs4?.length) {
            console.log(`DNS A also failed, using hostname as-is: ${host}`);
            resolve(url);
          } else {
            console.log(`Resolved ${host} -> ${addrs4[0]} (IPv4)`);
            resolve(url.replace(`@${host}:`, `@${addrs4[0]}:`));
          }
        });
      } else {
        console.log(`Resolved ${host} -> ${addrs[0]} (IPv6)`);
        resolve(url.replace(`@${host}:`, `@[${addrs[0]}]:`));
      }
    });
  });
}

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL not set in .env");
    process.exit(1);
  }

  const dbUrl = await resolveHost(rawUrl);
  console.log("Connecting to database...");

  const pool = new Pool({
    connectionString: dbUrl,
    max: 1,
    connectionTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const test = await pool.query("SELECT 1 AS ok");
    console.log("Connected:", test.rows[0]);

    const migrateSql = fs.readFileSync(
      path.join(process.cwd(), "migrate.sql"),
      "utf-8"
    );

    console.log("Running migration...");
    const result = await pool.query(migrateSql);
    const cmds = Array.isArray(result) ? result.length : 1;
    console.log(`Migration executed: ${cmds} commands`);

    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log("Tables:", tables.rows.map((r: any) => r.table_name).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Setup failed:", e.message);
  process.exit(1);
});
