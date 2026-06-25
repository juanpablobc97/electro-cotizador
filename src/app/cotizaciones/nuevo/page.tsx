"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import {
  buildLaborFromSurvey,
  buildMaterialsFromSurvey,
  buildNotesFromSurvey,
} from "@/lib/quote-from-survey";
import type { MaterialUnit, QuoteLaborItem, QuoteMaterialItem, WorkUnit } from "@/lib/types";
import { generateQuoteNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

function NuevaCotizacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const preselectedSurveyId = searchParams.get("surveyId") ?? "";
  const [saving, setSaving] = useState(false);
  const [materiales, setMateriales] = useState<QuoteMaterialItem[]>([]);
  const [manoObra, setManoObra] = useState<QuoteLaborItem[]>(
    preselectedSurveyId
      ? []
      : [{ descripcion: "Instalación eléctrica", cantidad: 1, unidad: "servicio", tarifaUnidad: 100 }],
  );
  const [notas, setNotas] = useState("");
  const seededSurveyId = useRef<number | null>(null);
  const seededMaterialsFor = useRef<number | null>(null);

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];
  const catalog = useLiveQuery(() => db.materials.orderBy("nombre").toArray()) ?? [];
  const survey = useLiveQuery(
    () => (preselectedSurveyId ? db.surveys.get(Number(preselectedSurveyId)) : undefined),
    [preselectedSurveyId],
  );

  useEffect(() => {
    if (!survey?.id || !preselectedSurveyId) return;
    if (seededSurveyId.current === survey.id) return;
    seededSurveyId.current = survey.id;

    setManoObra(buildLaborFromSurvey(survey));
    setNotas(buildNotesFromSurvey(survey));
  }, [survey, preselectedSurveyId]);

  useEffect(() => {
    if (!survey?.id || !preselectedSurveyId || catalog.length === 0) return;
    if (seededMaterialsFor.current === survey.id) return;
    seededMaterialsFor.current = survey.id;

    setMateriales(buildMaterialsFromSurvey(survey, catalog));
  }, [survey, catalog, preselectedSurveyId]);

  function addMaterialFromCatalog(materialId: string) {
    const material = catalog.find((m) => m.id === Number(materialId));
    if (!material) return;

    let cantidad = 1;
    if (survey) {
      const hasPartidas = (survey.partidas?.length ?? 0) > 0;
      if (!hasPartidas) {
        if (material.categoria === "Cableado") cantidad = survey.metrosCable || 1;
        if (material.categoria === "Contactos") cantidad = survey.numContactos || 1;
        if (material.categoria === "Iluminación") cantidad = survey.numLuminarias || 1;
        if (material.categoria === "Tableros" && survey.requiereTablero) cantidad = 1;
      }
    }

    setMateriales((prev) => [
      ...prev,
      {
        materialId: material.id,
        descripcion: material.nombre,
        unidad: material.unidad,
        cantidad,
        precioUnitario: material.precioUnitario,
      },
    ]);
  }

  function updateMaterial(index: number, field: keyof QuoteMaterialItem, value: string | number) {
    setMateriales((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function removeMaterial(index: number) {
    setMateriales((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLabor(index: number, field: keyof QuoteLaborItem, value: string | number) {
    setManoObra((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addLaborRow() {
    setManoObra((prev) => [...prev, { descripcion: "", cantidad: 1, unidad: "pza", tarifaUnidad: 100 }]);
  }

  function removeLabor(index: number) {
    setManoObra((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const now = new Date();

    const id = await dataStore.quotes.create({
      clientId: Number(form.get("clientId")),
      surveyId: form.get("surveyId") ? Number(form.get("surveyId")) : undefined,
      numero: generateQuoteNumber(),
      fecha: new Date(String(form.get("fecha"))),
      validezDias: Number(form.get("validezDias")),
      materiales,
      manoObra,
      notas: notas.trim() || undefined,
      ivaPorcentaje: Number(form.get("ivaPorcentaje")),
      estado: "borrador",
      createdAt: now,
      updatedAt: now,
    });

    router.push(`/cotizaciones/${id}`);
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader title="Nueva cotización" />
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader title="Nueva cotización" subtitle="Datos generales del presupuesto" />
        <div className="space-y-4">
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
          {preselectedSurveyId && (
            <input type="hidden" name="surveyId" value={preselectedSurveyId} />
          )}
          {survey && (
            <div className="rounded-lg bg-brand-gold-light p-3 text-sm text-brand-navy space-y-1">
              <p>
                Basada en levantamiento: <strong>{survey.titulo}</strong> ({survey.direccionObra})
              </p>
              {(survey.partidas?.length ?? 0) > 0 && (
                <p className="text-brand-navy/80">
                  Se precargaron {survey.partidas.length} partida(s) en mano de obra (cantidad × tarifa
                  por unidad). Agrega materiales del catálogo si aplica.
                </p>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Fecha"
              name="fecha"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Input label="Validez (días)" name="validezDias" type="number" defaultValue={15} />
            <Input label="IVA (%)" name="ivaPorcentaje" type="number" defaultValue={16} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Materiales" subtitle="Agrega del catálogo o manualmente" />
        {catalog.length > 0 && (
          <div className="mb-4">
            <Select
              label="Agregar del catálogo"
              name="catalogPick"
              options={[
                { value: "", label: "Seleccionar material..." },
                ...catalog.map((m) => ({
                  value: String(m.id),
                  label: `${m.nombre} — $${m.precioUnitario}/${m.unidad}`,
                })),
              ]}
              onChange={(e) => {
                addMaterialFromCatalog(e.target.value);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {materiales.length === 0 ? (
          <p className="text-sm text-slate-500">Sin materiales agregados.</p>
        ) : (
          <div className="space-y-3">
            {materiales.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
                <Input
                  label="Descripción"
                  value={item.descripcion}
                  onChange={(e) => updateMaterial(index, "descripcion", e.target.value)}
                />
                <Select
                  label="Unidad"
                  value={item.unidad}
                  onChange={(e) => updateMaterial(index, "unidad", e.target.value as MaterialUnit)}
                  options={[
                    { value: "pza", label: "pza" },
                    { value: "m", label: "m" },
                    { value: "rollo", label: "rollo" },
                    { value: "kg", label: "kg" },
                    { value: "caja", label: "caja" },
                  ]}
                />
                <Input
                  label="Cantidad"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.cantidad}
                  onChange={(e) => updateMaterial(index, "cantidad", Number(e.target.value))}
                />
                <Input
                  label="Precio unit."
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.precioUnitario}
                  onChange={(e) => updateMaterial(index, "precioUnitario", Number(e.target.value))}
                />
                <div className="flex items-end">
                  <Button type="button" variant="danger" size="sm" onClick={() => removeMaterial(index)}>
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() =>
            setMateriales((prev) => [
              ...prev,
              { descripcion: "", unidad: "pza", cantidad: 1, precioUnitario: 0 },
            ])
          }
        >
          + Material manual
        </Button>
      </Card>

      <Card>
        <CardHeader title="Mano de obra" subtitle="Tarifa por unidad (cantidad × tarifa)" />
        <div className="space-y-3">
          {manoObra.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
              <Input
                label="Descripción"
                value={item.descripcion}
                onChange={(e) => updateLabor(index, "descripcion", e.target.value)}
              />
              <Input
                label="Cantidad"
                type="number"
                min={0}
                step="0.01"
                value={item.cantidad}
                onChange={(e) => updateLabor(index, "cantidad", Number(e.target.value))}
              />
              <Select
                label="Unidad"
                value={item.unidad}
                onChange={(e) => updateLabor(index, "unidad", e.target.value as WorkUnit)}
                options={[
                  { value: "pza", label: "pza" },
                  { value: "m", label: "m" },
                  { value: "servicio", label: "servicio" },
                  { value: "hr", label: "hr" },
                  { value: "rollo", label: "rollo" },
                ]}
              />
              <Input
                label="Tarifa/unidad"
                type="number"
                min={0}
                step="0.01"
                value={item.tarifaUnidad}
                onChange={(e) => updateLabor(index, "tarifaUnidad", Number(e.target.value))}
              />
              <div className="flex items-end">
                <Button type="button" variant="danger" size="sm" onClick={() => removeLabor(index)}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3" onClick={addLaborRow}>
          + Agregar mano de obra
        </Button>
      </Card>

      <Card>
        <Textarea
          label="Notas"
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Condiciones, tiempos de entrega, forma de pago..."
        />
        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cotización"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Cargando...</p>}>
      <NuevaCotizacionForm />
    </Suspense>
  );
}
