"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { dataStore } from "@/lib/sync";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function NuevoClientePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const now = new Date();

    await dataStore.clients.create({
      nombre: String(form.get("nombre")),
      empresa: String(form.get("empresa") || "") || undefined,
      telefono: String(form.get("telefono")),
      email: String(form.get("email") || "") || undefined,
      direccion: String(form.get("direccion")),
      notas: String(form.get("notas") || "") || undefined,
      createdAt: now,
      updatedAt: now,
    });

    router.push("/clientes");
  }

  return (
    <Card>
      <CardHeader title="Nuevo cliente" subtitle="Datos de contacto y dirección" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre *" name="nombre" required placeholder="Juan Pérez" />
        <Input label="Empresa" name="empresa" placeholder="Constructora ABC" />
        <Input
          label="Teléfono *"
          name="telefono"
          type="tel"
          required
          placeholder="55 1234 5678"
        />
        <Input label="Correo" name="email" type="email" placeholder="cliente@email.com" />
        <Input label="Dirección *" name="direccion" required placeholder="Calle, colonia, ciudad" />
        <Textarea label="Notas" name="notas" placeholder="Referencias, horarios de visita..." />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cliente"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
