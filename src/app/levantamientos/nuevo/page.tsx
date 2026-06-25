"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import type { GeneralPhotos, SurveyWorkItem } from "@/lib/types";
import { createEmptyWorkItem } from "@/lib/survey-work";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormSection } from "@/components/survey/FormSection";
import { GeneralPhotosSection } from "@/components/survey/GeneralPhotosSection";
import { SurveySummaryTable } from "@/components/survey/SurveySummaryTable";
import { WorkItemCard } from "@/components/survey/WorkItemCard";

function NuevoLevantamientoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const [saving, setSaving] = useState(false);
  const [partidas, setPartidas] = useState<SurveyWorkItem[]>([]);
  const [fotosGenerales, setFotosGenerales] = useState<GeneralPhotos>({});

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];

  function addPartida() {
    setPartidas((prev) => [...prev, createEmptyWorkItem()]);
  }

  function updatePartida(index: number, item: SurveyWorkItem) {
    setPartidas((prev) => prev.map((p, i) => (i === index ? item : p)));
  }

  function removePartida(index: number) {
    setPartidas((prev) => prev.filter((_, i) => i !== index));
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
      numCircuitos: 0,
      metrosCable: 0,
      numContactos: 0,
      numLuminarias: 0,
      requiereTablero: false,
      partidas,
      fotosGenerales,
      fotos: [],
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
        subtitle="Captura por partidas cotizables — datos del sitio y trabajos a efectuar"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="1. Datos del cliente y obra">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Select
            label="Estado"
            name="estado"
            options={[
              { value: "borrador", label: "Borrador" },
              { value: "completado", label: "Completado" },
            ]}
          />
        </FormSection>

        <FormSection
          title="2. Trabajos a efectuar"
          subtitle="Cada trabajo se guarda como una partida cotizable"
        >
          {partidas.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay trabajos agregados.</p>
          ) : (
            <div className="space-y-4">
              {partidas.map((item, index) => (
                <WorkItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onChange={(updated) => updatePartida(index, updated)}
                  onRemove={() => removePartida(index)}
                />
              ))}
            </div>
          )}
          <Button type="button" variant="secondary" onClick={addPartida}>
            + Agregar trabajo
          </Button>
        </FormSection>

        <FormSection
          title="3. Evidencia fotográfica general"
          subtitle="Fotos del sitio separadas de las fotos por partida"
        >
          <GeneralPhotosSection fotosGenerales={fotosGenerales} onChange={setFotosGenerales} />
        </FormSection>

        <FormSection title="4. Resumen para cotización">
          <SurveySummaryTable partidas={partidas} />
        </FormSection>

        <div className="flex flex-wrap gap-3 pt-2">
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
