export interface Company {
  id: string;
  name: string;
  slug: string;
  stripeCustomerId?: string | null;
  subscriptionStatus: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  password?: string | null;
  role: "ADMIN" | "MANAGER" | "VIEWER";
  companyId: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  position: string;
  baseSalary: number;
  status: "ACTIVE" | "INACTIVE";
  startDate: Date;
  phone?: string | null;
  monthlyAdvanceLimit: number;
  payDay: number;
  companyId: string;
  createdAt: Date;
}

export interface SalaryAdvance {
  id: string;
  amount: number;
  reason?: string | null;
  date: Date;
  type: "SALARY" | "EMERGENCY" | "MEDICAL" | "OTHER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  employeeId: string;
  companyId: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  appliedInPayrollId?: string | null;
  appliedInEmployeePayrollId?: string | null;
  createdAt: Date;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  periodMonth: number;
  periodYear: number;
  status: "DRAFT" | "APPROVED" | "PAID" | "PENDING";
  totalAmount: number;
  processedBy?: string | null;
  createdAt: Date;
}

export interface PayrollRecord {
  id: string;
  payrollRunId: string;
  employeeId: string;
  baseSalary: number;
  totalAdvances: number;
  netSalary: number;
  deductions: number;
  status: "PENDING" | "PAID";
  createdAt: Date;
}

export interface EmployeePayroll {
  id: string;
  employeeId: string;
  companyId: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  totalAdvances: number;
  netSalary: number;
  deductions: number;
  status: "PENDING" | "PAID";
  paidById?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
}
