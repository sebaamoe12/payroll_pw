import { config } from "dotenv";
config();

import { PrismaClient } from "../src/generated/prisma/client.js";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.POSTGRES_URL
    ?? "";
}

async function main() {
  const url = getDatabaseUrl();
  const isSupabase = url.includes("supabase");
  const pool = new Pool({
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg(pool as never);
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding...");

  await prisma.salaryAdvance.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.employeePayroll.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Société Démo",
      slug: "demo-company",
    },
  });

  console.log(`Company created: ${company.id}`);

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

  console.log(`User created: ${user.email} / admin123`);

  const employees = [
    { firstName: "Marie", lastName: "Dupont", position: "Développeur Full Stack", baseSalary: 45000 },
    { firstName: "Jean", lastName: "Martin", position: "Chef de Projet", baseSalary: 55000 },
    { firstName: "Sophie", lastName: "Leroy", position: "Designer UX", baseSalary: 38000 },
  ];

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        ...emp,
        startDate: new Date("2024-01-01"),
        companyId: company.id,
      },
    });
  }

  console.log(`${employees.length} employees created`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
