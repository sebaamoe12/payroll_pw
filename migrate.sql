-- Migration SQL idempotente pour Payroll Pro
-- Peut être exécutée plusieurs fois sans risque

-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvanceType" AS ENUM ('SALARY', 'EMERGENCY', 'MEDICAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdvanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollRecordStatus" AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "Company" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  "stripeCustomerId" TEXT,
  "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password TEXT,
  role "Role" NOT NULL DEFAULT 'VIEWER',
  "companyId" TEXT NOT NULL REFERENCES "Company"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Employee" (
  id TEXT PRIMARY KEY,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  email TEXT,
  position TEXT NOT NULL,
  "baseSalary" DECIMAL(10,2) NOT NULL,
  status "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMPTZ NOT NULL,
  phone TEXT,
  "monthlyAdvanceLimit" DECIMAL(10,2) NOT NULL DEFAULT 50000,
  "payDay" INTEGER NOT NULL DEFAULT 1,
  "companyId" TEXT NOT NULL REFERENCES "Company"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SalaryAdvance" (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  date TIMESTAMPTZ NOT NULL,
  type "AdvanceType" NOT NULL DEFAULT 'SALARY',
  status "AdvanceStatus" NOT NULL DEFAULT 'PENDING',
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id),
  "companyId" TEXT NOT NULL REFERENCES "Company"(id),
  "approvedById" TEXT REFERENCES "User"(id),
  "approvedAt" TIMESTAMPTZ,
  "appliedInPayrollId" TEXT,
  "appliedInEmployeePayrollId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PayrollRun" (
  id TEXT PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"(id),
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  status "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "processedBy" TEXT REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "PayrollRecord" (
  id TEXT PRIMARY KEY,
  "payrollRunId" TEXT NOT NULL REFERENCES "PayrollRun"(id),
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id),
  "baseSalary" DECIMAL(10,2) NOT NULL,
  "totalAdvances" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "netSalary" DECIMAL(10,2) NOT NULL,
  deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
  status "PayrollRecordStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "EmployeePayroll" (
  id TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL REFERENCES "Employee"(id),
  "companyId" TEXT NOT NULL REFERENCES "Company"(id),
  "periodMonth" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "baseSalary" DECIMAL(10,2) NOT NULL,
  "totalAdvances" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "netSalary" DECIMAL(10,2) NOT NULL,
  deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
  status "PayrollRecordStatus" NOT NULL DEFAULT 'PENDING',
  "paidById" TEXT REFERENCES "User"(id),
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"(provider, "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"(identifier, token);
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeePayroll_employeeId_periodMonth_periodYear_key" ON "EmployeePayroll"("employeeId", "periodMonth", "periodYear");

-- Foreign keys for SalaryAdvance (circular refs, added separately)
DO $$ BEGIN
  ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_appliedInPayrollId_fkey"
    FOREIGN KEY ("appliedInPayrollId") REFERENCES "PayrollRun"(id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_appliedInEmployeePayrollId_fkey"
    FOREIGN KEY ("appliedInEmployeePayrollId") REFERENCES "EmployeePayroll"(id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Seed data
INSERT INTO "Company" (id, name, slug, "subscriptionStatus", "createdAt")
VALUES ('seed-company-001', 'Société Démo', 'demo-company', 'active', NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  "subscriptionStatus" = EXCLUDED."subscriptionStatus";

-- Password: admin123 (bcrypt hash)
INSERT INTO "User" (id, email, name, password, role, "companyId", "createdAt")
VALUES (
  'seed-user-001',
  'admin@demo.com',
  'Admin Démo',
  '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5GzGq0B7Y1q2J3k4L5M6N7O8',
  'ADMIN',
  'seed-company-001',
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "companyId" = EXCLUDED."companyId";
