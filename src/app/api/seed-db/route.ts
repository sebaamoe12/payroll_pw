import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/server/db";
import type { Company, User, Employee } from "@/server/db/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const setupKey = process.env.SETUP_KEY;
    if (!setupKey) {
      return NextResponse.json({ error: "SETUP_KEY not configured" }, { status: 500 });
    }
    if (request.headers.get("x-setup-key") !== setupKey) {
      return NextResponse.json({ error: "Invalid setup key" }, { status: 401 });
    }

    const existingUser = await queryOne<User>('SELECT id FROM "User" WHERE email = $1', ["admin@demo.com"]);
    if (existingUser) {
      return NextResponse.json({ message: "Database already seeded" });
    }

    const company = await queryOne<Company>(
      `INSERT INTO "Company" (id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
      ["seed-company-001", "Société Démo", "demo-company"]
    );

    const hashedPassword = await bcrypt.hash("admin123", 12);

    const user = await queryOne<User>(
      `INSERT INTO "User" (id, email, name, password, role, "companyId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      ["seed-user-001", "admin@demo.com", "Admin Démo", hashedPassword, "ADMIN", "seed-company-001"]
    );

    const employeesData = [
      { id: "emp-001", firstName: "Marie", lastName: "Dupont", position: "Développeur Full Stack", baseSalary: 45000 },
      { id: "emp-002", firstName: "Jean", lastName: "Martin", position: "Chef de Projet", baseSalary: 55000 },
      { id: "emp-003", firstName: "Sophie", lastName: "Leroy", position: "Designer UX", baseSalary: 38000 },
    ];

    for (const emp of employeesData) {
      await query(
        `INSERT INTO "Employee" (id, "firstName", "lastName", position, "baseSalary", "startDate", "companyId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [emp.id, emp.firstName, emp.lastName, emp.position, emp.baseSalary, new Date("2024-01-01").toISOString(), "seed-company-001"]
      );
    }

    return NextResponse.json({
      success: true,
      company: "seed-company-001",
      user: user!.email,
      employees: 3,
    });
  } catch (error) {
    console.error("Seed-db error:", error);
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
