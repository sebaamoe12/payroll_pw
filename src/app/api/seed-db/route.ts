import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "@/server/db";

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

    const prisma = createPrismaClient();

    const existingUser = await prisma.user.findUnique({ where: { email: "admin@demo.com" } });
    if (existingUser) {
      await prisma.$disconnect();
      return NextResponse.json({ message: "Database already seeded" });
    }

    const company = await prisma.company.create({
      data: { name: "Société Démo", slug: "demo-company" },
    });

    const hashedPassword = await bcrypt.hash("admin123", 12);

    const user = await prisma.user.create({
      data: {
        email: "admin@demo.com",
        name: "Admin Démo",
        password: hashedPassword,
        role: "ADMIN",
        companyId: company.id,
      },
    });

    const employeesData = [
      { firstName: "Marie", lastName: "Dupont", position: "Développeur Full Stack", baseSalary: 45000 },
      { firstName: "Jean", lastName: "Martin", position: "Chef de Projet", baseSalary: 55000 },
      { firstName: "Sophie", lastName: "Leroy", position: "Designer UX", baseSalary: 38000 },
    ];

    let employees = 0;
    for (const emp of employeesData) {
      await prisma.employee.create({
        data: { ...emp, startDate: new Date("2024-01-01"), companyId: company.id },
      });
      employees++;
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      company: company.id,
      user: user.email,
      employees,
    });
  } catch (error) {
    console.error("Seed-db error:", error);
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
