"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import type { GeneralPhotos, SurveyArea } from "@/lib/types";
import { createEmptyArea, flattenAreasToPartidas } from "@/lib/survey-work";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AreaCard } from "@/components/survey/AreaCard";
import { FormSection } from "@/components/survey/FormSection";
import { GeneralPhotosSection } from "@/components/survey/GeneralPhotosSection";
import { ObraDireccionField } from "@/components/survey/ObraDireccionField";
import { SurveySummaryTable } from "@/components/survey/SurveySummaryTable";

function NuevoLevantamientoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(preselectedClientId);
  const [direccionModo, setDireccionModo] = useState<"cliente" | "otra">("cliente");
  const [direccionObra, setDireccionObra] = useState("");
  const [areas, setAreas] = useState<SurveyArea[]>([]);
  const [fotosGenerales, setFotosGenerales] = useState<GeneralPhotos>({});

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];
  const selectedClient = clients.find((c) => String(c.id) === clientId);
  const partidasResumen = flattenAreasToPartidas(areas);

  useEffect(() => {
    if (!selectedClient) return;
    if (direccionModo === "cliente") {
      setDireccionObra(selectedClient.direccion);
    }
  }, [selectedClient, direccionModo]);

  function handleClientChange(value: string) {
    setClientId(value);
    const client = clients.find((c) => String(c.id) === value);
    if (client && direccionModo === "cliente") {
      setDireccionObra(client.direccion);
    }
  }

  function handleDireccionModoChange(modo: "cliente" | "otra") {
    setDireccionModo(modo);
    if (modo === "cliente" && selectedClient) {
      setDireccionObra(selectedClient.direccion);
    }
  }

  function addArea() {
    setAreas((prev) => [...prev, createEmptyArea()]);
  }

  function updateArea(index: number, area: SurveyArea) {
    setAreas((prev) => prev.map((a, i) => (i === index ? area : a)));
  }

  function removeArea(index: number) {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!direccionObra.trim()) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const now = new Date();
    const partidas = flattenAreasToPartidas(areas);

    const id = await dataStore.surveys.create({
      clientId: Number(form.get("clientId")),
      titulo: String(form.get("titulo")),
      fecha: new Date(String(form.get("fecha"))),
      direccionObra: direccionObra.trim(),
      estado: form.get("estado") as "borrador" | "completado",
      tipoInstalacion: String(form.get("tipoInstalacion")),
      voltaje: String(form.get("voltaje")),
      numCircuitos: 0,
      metrosCable: 0,
      numContactos: 0,
      numLuminarias: 0,
      requiereTablero: false,
      areas,
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
        subtitle="Captura por áreas y partidas cotizables"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="1. Datos del cliente y obra">
          <Select
            label="Cliente *"
            name="clientId"
            required
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
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
          <ObraDireccionField
            modo={direccionModo}
            direccion={direccionObra}
            direccionCliente={selectedClient?.direccion ?? ""}
            onModoChange={handleDireccionModoChange}
            onDireccionChange={setDireccionObra}
          />
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
          title="2. Áreas / ubicación y trabajos"
          subtitle="Agrega cada zona de la obra y los trabajos que corresponden"
        >
          {areas.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay áreas agregadas.</p>
          ) : (
            <div className="space-y-4">
              {areas.map((area, index) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  index={index}
                  onChange={(updated) => updateArea(index, updated)}
                  onRemove={() => removeArea(index)}
                />
              ))}
            </div>
          )}
          <Button type="button" variant="secondary" onClick={addArea}>
            + Agregar área / ubicación
          </Button>
        </FormSection>

        <FormSection
          title="3. Evidencia fotográfica general"
          subtitle="Fotos del sitio separadas de las fotos por partida"
        >
          <GeneralPhotosSection fotosGenerales={fotosGenerales} onChange={setFotosGenerales} />
        </FormSection>

        <FormSection title="4. Resumen para cotización">
          <SurveySummaryTable partidas={partidasResumen} />
        </FormSection>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saving || !clientId || !direccionObra.trim()}>
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
