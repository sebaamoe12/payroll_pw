"use client";

import { useState } from "react";
import { api } from "@/components/TRPCProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const { data: overview, isLoading } = api.report.overview.useQuery();
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const { data: monthlyData, refetch: refetchMonthly } = api.report.monthly.useQuery(
    { month: parseInt(month), year: parseInt(year) },
    { enabled: false }
  );

  function handleSearch() {
    refetchMonthly();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total employés</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.employees ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Employés actifs</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{overview?.activeEmployees ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total des retenues</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
              overview?.totals?.deductions ?? 0
            )}
          </p>
        </Card>
      </div>

      <Card title="Rapport mensuel">
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button onClick={handleSearch}>Rechercher</Button>
        </div>

        {monthlyData && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Employés actifs ({monthlyData.employees.length})</h4>
              <div className="flex flex-wrap gap-2">
                {monthlyData.employees.map((emp) => (
                  <Badge key={emp.id} variant="success">
                    {emp.firstName} {emp.lastName}
                  </Badge>
                ))}
              </div>
            </div>

            {monthlyData.advances.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Avances du mois</h4>
                {monthlyData.advances.map((adv) => (
                  <div key={adv.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-900">
                      {adv.employee.firstName} {adv.employee.lastName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                          Number(adv.amount)
                        )}
                      </span>
                      <Badge variant={adv.status === "PAID" ? "success" : "warning"}>
                        {adv.status === "PAID" ? "Payée" : "En attente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {monthlyData.payrollRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Registres de paie</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salaire</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.payrollRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {rec.employee.firstName} {rec.employee.lastName}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                              Number(rec.baseSalary)
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                              Number(rec.netSalary)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
