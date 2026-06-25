"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

function NuevoLevantamientoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const now = new Date();

    const id = await dataStore.surveys.create({
      clientId: Number(form.get("clientId")),
      titulo: String(form.get("titulo")),
      fecha: new Date(String(form.get("fecha"))),
      direccionObra: String(form.get("direccionObra")),
      estado: form.get("estado") as "borrador" | "completado",
      tipoInstalacion: String(form.get("tipoInstalacion")),
      voltaje: String(form.get("voltaje")),
      numCircuitos: Number(form.get("numCircuitos")),
      metrosCable: Number(form.get("metrosCable")),
      numContactos: Number(form.get("numContactos")),
      numLuminarias: Number(form.get("numLuminarias")),
      requiereTablero: form.get("requiereTablero") === "on",
      notas: String(form.get("notas") || "") || undefined,
      fotos,
      createdAt: now,
      updatedAt: now,
    });

    router.push(`/levantamientos/${id}`);
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader title="Nuevo levantamiento" />
        <p className="mb-4 text-sm text-slate-600">
          Primero necesitas registrar al menos un cliente.
        </p>
        <Link href="/clientes/nuevo">
          <Button>Agregar cliente</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Nuevo levantamiento"
        subtitle="Datos técnicos y observaciones de la visita en sitio"
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Cliente *"
          name="clientId"
          required
          defaultValue={preselectedClientId}
          options={[
            { value: "", label: "Seleccionar cliente..." },
            ...clients.map((c) => ({ value: String(c.id), label: c.nombre })),
          ]}
        />
        <Input label="Título *" name="titulo" required placeholder="Instalación casa habitación" />
        <Input
          label="Fecha *"
          name="fecha"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <Input label="Dirección de obra *" name="direccionObra" required />
        <Select
          label="Estado"
          name="estado"
          options={[
            { value: "borrador", label: "Borrador" },
            { value: "completado", label: "Completado" },
          ]}
        />
        <Select
          label="Tipo de instalación"
          name="tipoInstalacion"
          options={[
            { value: "residencial", label: "Residencial" },
            { value: "comercial", label: "Comercial" },
            { value: "industrial", label: "Industrial" },
            { value: "remodelacion", label: "Remodelación" },
          ]}
        />
        <Select
          label="Voltaje"
          name="voltaje"
          options={[
            { value: "127V", label: "127V monofásico" },
            { value: "220V", label: "220V bifásico" },
            { value: "220V/440V", label: "220V/440V trifásico" },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="No. circuitos" name="numCircuitos" type="number" min={0} defaultValue={0} />
          <Input label="Metros de cable" name="metrosCable" type="number" min={0} defaultValue={0} />
          <Input label="Contactos" name="numContactos" type="number" min={0} defaultValue={0} />
          <Input label="Luminarias" name="numLuminarias" type="number" min={0} defaultValue={0} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requiereTablero" className="h-4 w-4 rounded" />
          Requiere tablero de distribución
        </label>
        <Textarea label="Notas y observaciones" name="notas" placeholder="Condiciones del sitio, accesos, riesgos..." />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Fotos del sitio</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoCapture}
            className="text-sm"
          />
          {fotos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {fotos.map((foto, i) => (
                <img
                  key={i}
                  src={foto}
                  alt={`Foto ${i + 1}`}
                  className="aspect-square rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar levantamiento"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function NuevoLevantamientoPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Cargando...</p>}>
      <NuevoLevantamientoForm />
    </Suspense>
  );
}
