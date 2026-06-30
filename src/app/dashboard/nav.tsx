"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard/overview", label: "Vue d'ensemble" },
  { href: "/dashboard/employees", label: "Employés" },
  { href: "/dashboard/advances", label: "Avances" },
  { href: "/dashboard/payroll", label: "Paie" },
  { href: "/dashboard/reports", label: "Rapports" },
];

export function DashboardNav({ user }: { user: { name?: string; email: string; role: string } }) {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard/overview" className="text-lg font-bold text-indigo-600">
              Payroll Pro
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 hidden sm:block">
              {user.name || user.email}
              <span className="ml-2 text-xs uppercase tracking-wider text-gray-400">
                ({user.role})
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
