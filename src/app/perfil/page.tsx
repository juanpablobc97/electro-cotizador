"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (newPassword !== confirmPassword) {
      setError("La nueva contraseña y la confirmación no coinciden");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "change-password",
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la contraseña");
      setSaving(false);
      return;
    }

    (e.target as HTMLFormElement).reset();
    setMessage("Contraseña actualizada correctamente");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  if (!user) {
    return <p className="text-slate-500">Sesión no válida.</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Mi cuenta" subtitle={`Usuario: ${user.username}`} />

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Contraseña actual"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
          <Input
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            required
            minLength={4}
            autoComplete="new-password"
          />
          <Input
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            type="password"
            required
            minLength={4}
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
