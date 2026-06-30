"use client";

import { api } from "@/components/TRPCProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OverviewPage() {
  const { data, isLoading } = api.report.overview.useQuery();

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Vue d'ensemble</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total employés</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data?.employees ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Employés actifs</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{data?.activeEmployees ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Masse salariale nette</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
              data?.totals?.netSalary ?? 0
            )}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total avances</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
              data?.totals?.advances ?? 0
            )}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Campagnes de paie récentes">
          {data?.recentPayrollRuns?.length ? (
            <div className="space-y-3">
              {data.recentPayrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {run.periodMonth}/{run.periodYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                        Number(run.totalAmount)
                      )}
                    </span>
                    <Badge
                      variant={
                        run.status === "PAID" ? "success" : run.status === "APPROVED" ? "info" : "warning"
                      }
                    >
                      {run.status === "PAID" ? "Payée" : run.status === "APPROVED" ? "Approuvée" : "Brouillon"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucune campagne de paie</p>
          )}
        </Card>

        <Card title="Dernières avances">
          {data?.recentAdvances?.length ? (
            <div className="space-y-3">
              {data.recentAdvances.map((adv) => (
                <div key={adv.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                        Number(adv.amount)
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{adv.type}</p>
                  </div>
                  <Badge
                    variant={
                      adv.status === "PAID" ? "success" : adv.status === "APPROVED" ? "info" : adv.status === "REJECTED" ? "danger" : "warning"
                    }
                  >
                    {adv.status === "PAID" ? "Payée" : adv.status === "APPROVED" ? "Approuvée" : adv.status === "REJECTED" ? "Refusée" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucune avance</p>
          )}
        </Card>
      </div>
    </div>
  );
}
