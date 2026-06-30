"use client";

import { useState } from "react";
import { api } from "@/components/TRPCProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ToastProvider";

const statusVariant: Record<string, "warning" | "success" | "info"> = {
  DRAFT: "warning",
  APPROVED: "info",
  PAID: "success",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Brouillon",
  APPROVED: "Approuvée",
  PAID: "Payée",
};

const recordStatusVariant: Record<string, "warning" | "success"> = {
  PENDING: "warning",
  PAID: "success",
};

export default function PayrollPage() {
  const { data: payrolls, isLoading, refetch } = api.payroll.list.useQuery();
  const createMutation = api.payroll.create.useMutation();
  const approveMutation = api.payroll.approve.useMutation();
  const payMutation = api.payroll.pay.useMutation();
  const { addToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    periodMonth: (new Date().getMonth() + 1).toString(),
    periodYear: new Date().getFullYear().toString(),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        periodMonth: parseInt(form.periodMonth),
        periodYear: parseInt(form.periodYear),
      });
      addToast("Campagne de paie créée", "success");
      setShowCreate(false);
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveMutation.mutateAsync(id);
      addToast("Paie approuvée", "success");
      refetch();
    } catch {
      addToast("Erreur", "error");
    }
  }

  async function handlePay(id: string) {
    try {
      await payMutation.mutateAsync(id);
      addToast("Paie validée", "success");
      refetch();
    } catch {
      addToast("Erreur", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paie</h1>
        <Button onClick={() => setShowCreate(true)}>Nouvelle campagne</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Chargement...</div>
      ) : payrolls?.length ? (
        <div className="space-y-4">
          {payrolls.map((run) => (
            <Card key={run.id}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {run.periodMonth}/{run.periodYear}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Total : {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                      Number(run.totalAmount)
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant[run.status]}>{statusLabel[run.status]}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}>
                    {expandedId === run.id ? "Masquer" : "Détails"}
                  </Button>
                  {run.status === "DRAFT" && (
                    <Button size="sm" variant="primary" onClick={() => handleApprove(run.id)}>Approuver</Button>
                  )}
                  {run.status === "APPROVED" && (
                    <Button size="sm" variant="success" onClick={() => handlePay(run.id)}>Payer</Button>
                  )}
                </div>
              </div>

              {expandedId === run.id && (
                <div className="overflow-x-auto border-t border-gray-100 pt-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salaire</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avances</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {run.records.map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {rec.employee.firstName} {rec.employee.lastName}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                              Number(rec.baseSalary)
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                              Number(rec.totalAdvances)
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                              Number(rec.netSalary)
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={recordStatusVariant[rec.status]}>{rec.status === "PAID" ? "Payé" : "En attente"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8 text-gray-500">Aucune campagne de paie</div>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle campagne de paie">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <select
                value={form.periodMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, periodMonth: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <Input
              label="Année"
              type="number"
              value={form.periodYear}
              onChange={(e) => setForm((prev) => ({ ...prev, periodYear: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
