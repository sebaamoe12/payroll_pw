"use client";

import { useState } from "react";
import { api } from "@/components/TRPCProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ToastProvider";

const statusVariant: Record<string, "warning" | "success" | "danger" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "danger",
  PAID: "success",
};

const statusLabel: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  PAID: "Payée",
};

const typeOptions = [
  { value: "SALARY", label: "Salaire" },
  { value: "EMERGENCY", label: "Urgence" },
  { value: "MEDICAL", label: "Médical" },
  { value: "OTHER", label: "Autre" },
];

export default function AdvancesPage() {
  const { data: advances, isLoading, refetch } = api.advance.list.useQuery();
  const { data: employees } = api.employee.list.useQuery();
  const createMutation = api.advance.create.useMutation();
  const approveMutation = api.advance.approve.useMutation();
  const rejectMutation = api.advance.reject.useMutation();
  const { addToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
    type: "SALARY",
  });

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        employeeId: form.employeeId,
        amount: parseFloat(form.amount),
        reason: form.reason || undefined,
        date: form.date,
        type: form.type as "SALARY" | "EMERGENCY" | "MEDICAL" | "OTHER",
      });
      addToast("Demande créée avec succès", "success");
      setShowModal(false);
      setForm({ employeeId: "", amount: "", reason: "", date: new Date().toISOString().split("T")[0], type: "SALARY" });
      refetch();
    } catch {
      addToast("Erreur lors de la création", "error");
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveMutation.mutateAsync(id);
      addToast("Avance approuvée", "success");
      refetch();
    } catch {
      addToast("Erreur", "error");
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectMutation.mutateAsync(id);
      addToast("Avance refusée", "success");
      refetch();
    } catch {
      addToast("Erreur", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Avances sur salaire</h1>
        <Button onClick={() => setShowModal(true)}>Nouvelle demande</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : advances?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employé</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {adv.employee.firstName} {adv.employee.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                        Number(adv.amount)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{adv.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(adv.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[adv.status]}>{statusLabel[adv.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {adv.status === "PENDING" && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleApprove(adv.id)}>
                            Approuver
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(adv.id)}>
                            Refuser
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Aucune avance</div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle demande d'avance">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
            <select
              value={form.employeeId}
              onChange={updateField("employeeId")}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sélectionner...</option>
              {employees?.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <Input label="Montant (€)" type="number" step="0.01" value={form.amount} onChange={updateField("amount")} required />
          <Input label="Motif" value={form.reason} onChange={updateField("reason")} />
          <Input label="Date" type="date" value={form.date} onChange={updateField("date")} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={updateField("type")}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
