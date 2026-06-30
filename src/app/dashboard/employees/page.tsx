"use client";

import { useState } from "react";
import { api } from "@/components/TRPCProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ToastProvider";

export default function EmployeesPage() {
  const { data: employees, isLoading, refetch } = api.employee.list.useQuery();
  const createMutation = api.employee.create.useMutation();
  const deleteMutation = api.employee.delete.useMutation();
  const { addToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    baseSalary: "",
    startDate: "",
    phone: "",
    payDay: "1",
  });

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        position: form.position,
        baseSalary: parseFloat(form.baseSalary),
        startDate: form.startDate,
        phone: form.phone || undefined,
        payDay: parseInt(form.payDay),
        monthlyAdvanceLimit: 50000,
      });
      addToast("Employé créé avec succès", "success");
      setShowModal(false);
      setForm({ firstName: "", lastName: "", email: "", position: "", baseSalary: "", startDate: "", phone: "", payDay: "1" });
      refetch();
    } catch {
      addToast("Erreur lors de la création", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      addToast("Employé supprimé", "success");
      setDeleteId(null);
      refetch();
    } catch {
      addToast("Erreur lors de la suppression", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employés</h1>
        <Button onClick={() => setShowModal(true)}>Nouvel employé</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : employees?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salaire</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{emp.position}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                        Number(emp.baseSalary)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.status === "ACTIVE" ? "success" : "default"}>
                        {emp.status === "ACTIVE" ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(emp.id)}>
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Aucun employé</div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvel employé">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" value={form.firstName} onChange={updateField("firstName")} required />
            <Input label="Nom" value={form.lastName} onChange={updateField("lastName")} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={updateField("email")} />
          <Input label="Poste" value={form.position} onChange={updateField("position")} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Salaire de base (€)" type="number" step="0.01" value={form.baseSalary} onChange={updateField("baseSalary")} required />
            <Input label="Jour de paie" type="number" min="1" max="31" value={form.payDay} onChange={updateField("payDay")} />
          </div>
          <Input label="Date d'embauche" type="date" value={form.startDate} onChange={updateField("startDate")} required />
          <Input label="Téléphone" value={form.phone} onChange={updateField("phone")} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={createMutation.isPending}>Créer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmer la suppression">
        <p className="text-gray-600 mb-4">Êtes-vous sûr de vouloir supprimer cet employé ?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
