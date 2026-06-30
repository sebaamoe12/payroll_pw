"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Erreur lors de la connexion automatique");
      setLoading(false);
    } else {
      router.push("/dashboard/overview");
    }
  }

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Pro</h1>
          <p className="text-sm text-gray-500 mt-1">Créez votre compte entreprise</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <Input
            label="Nom de l'entreprise"
            value={form.companyName}
            onChange={updateField("companyName")}
            required
            placeholder="Ma Société SAS"
          />

          <Input
            label="Votre nom"
            value={form.name}
            onChange={updateField("name")}
            placeholder="Jean Dupont"
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={updateField("email")}
            required
            placeholder="vous@exemple.fr"
          />

          <Input
            label="Mot de passe"
            type="password"
            value={form.password}
            onChange={updateField("password")}
            required
            placeholder="Minimum 6 caractères"
          />

          <Button type="submit" loading={loading} className="w-full">
            S&apos;inscrire
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
