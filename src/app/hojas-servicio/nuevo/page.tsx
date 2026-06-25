"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import {
  buildServiceDataFromClient,
  buildServiceDataFromQuote,
} from "@/lib/service-autofill";
import type { MaterialUnit, ServiceMaterialItem, ServiceType } from "@/lib/types";
import { generateServiceNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

function NuevaHojaServicioForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId") ?? "";
  const preselectedQuoteId = searchParams.get("quoteId") ?? "";

  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(preselectedClientId);
  const [quoteId, setQuoteId] = useState(preselectedQuoteId);
  const [direccionServicio, setDireccionServicio] = useState("");
  const [tipoServicio, setTipoServicio] = useState<ServiceType>("instalacion");
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [notas, setNotas] = useState("");
  const [materiales, setMateriales] = useState<ServiceMaterialItem[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];
  const catalog = useLiveQuery(() => db.materials.orderBy("nombre").toArray()) ?? [];
  const clientQuotes = useLiveQuery(
    () =>
      clientId
        ? db.quotes.where("clientId").equals(Number(clientId)).reverse().sortBy("fecha")
        : [],
    [clientId],
  );

  useEffect(() => {
    if (!clientId) return;
    buildServiceDataFromClient(Number(clientId)).then((data) => {
      if (data.direccionServicio && !quoteId) {
        setDireccionServicio(data.direccionServicio);
      }
    });
  }, [clientId, quoteId]);

  useEffect(() => {
    if (!quoteId) return;
    buildServiceDataFromQuote(Number(quoteId)).then((data) => {
      if (!data) return;
      setClientId(String(data.clientId));
      setDireccionServicio(data.direccionServicio);
      setDescripcionTrabajo(data.descripcionTrabajo);
      setMateriales(data.materiales);
      setTipoServicio(data.tipoServicio);
      if (data.notas) setNotas(data.notas);
    });
  }, [quoteId]);

  function addMaterialFromCatalog(materialId: string) {
    const material = catalog.find((m) => m.id === Number(materialId));
    if (!material) return;
    setMateriales((prev) => [
      ...prev,
      {
        materialId: material.id,
        descripcion: material.nombre,
        unidad: material.unidad,
        cantidad: 1,
      },
    ]);
  }

  function updateMaterial(index: number, field: keyof ServiceMaterialItem, value: string | number) {
    setMateriales((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

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

    const id = await dataStore.serviceSheets.create({
      clientId: Number(clientId),
      quoteId: quoteId ? Number(quoteId) : undefined,
      numero: generateServiceNumber(),
      fecha: new Date(String(form.get("fecha"))),
      tipoServicio,
      direccionServicio,
      descripcionTrabajo,
      materiales,
      garantiaMeses: Number(form.get("garantiaMeses")),
      notas: notas || undefined,
      fotos,
      tecnico: String(form.get("tecnico") || "") || undefined,
      createdAt: now,
      updatedAt: now,
    });

    router.push(`/hojas-servicio/${id}`);
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader title="Nueva hoja de servicio" />
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
        <CardHeader
          title="Nueva hoja de servicio"
          subtitle="Elige cliente y cotización para llenar los datos automáticamente"
        />
        <div className="space-y-4">
          <Select
            label="Cliente *"
            name="clientId"
            required
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setQuoteId("");
              setMateriales([]);
              setDescripcionTrabajo("");
            }}
            options={[
              { value: "", label: "Seleccionar cliente..." },
              ...clients.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />

          {clientId && (clientQuotes ?? []).length > 0 && (
            <Select
              label="Cotización (autocompletar datos)"
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
              options={[
                { value: "", label: "Sin cotización — llenar manualmente" },
                ...(clientQuotes ?? []).map((q) => ({
                  value: String(q.id),
                  label: `${q.numero} · ${q.estado}`,
                })),
              ]}
            />
          )}

          {quoteId && (
            <p className="rounded-lg bg-brand-gold-light p-3 text-sm text-brand-navy">
              Datos cargados desde la cotización seleccionada. Puedes editarlos antes de guardar.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Fecha del servicio *"
              name="fecha"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Select
              label="Tipo de servicio *"
              name="tipoServicio"
              required
              value={tipoServicio}
              onChange={(e) => setTipoServicio(e.target.value as ServiceType)}
              options={[
                { value: "instalacion", label: "Instalación" },
                { value: "reparacion", label: "Reparación" },
                { value: "mantenimiento", label: "Mantenimiento" },
                { value: "revision", label: "Revisión" },
                { value: "otro", label: "Otro" },
              ]}
            />
          </div>
          <Input
            label="Dirección del servicio *"
            name="direccionServicio"
            required
            value={direccionServicio}
            onChange={(e) => setDireccionServicio(e.target.value)}
          />
          <Input label="Técnico responsable" name="tecnico" placeholder="Nombre del técnico" />
          <Input
            label="Garantía (meses) *"
            name="garantiaMeses"
            type="number"
            min={0}
            defaultValue={12}
            required
          />
          <Textarea
            label="Trabajo realizado *"
            name="descripcionTrabajo"
            required
            value={descripcionTrabajo}
            onChange={(e) => setDescripcionTrabajo(e.target.value)}
            placeholder="Describe detalladamente qué se instaló, reparó o revisó..."
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Materiales utilizados" />
        {catalog.length > 0 && (
          <div className="mb-4">
            <Select
              label="Agregar del catálogo"
              name="catalogPick"
              options={[
                { value: "", label: "Seleccionar material..." },
                ...catalog.map((m) => ({
                  value: String(m.id),
                  label: `${m.nombre} (${m.unidad})`,
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
          <p className="text-sm text-slate-500">Sin materiales registrados.</p>
        ) : (
          <div className="space-y-3">
            {materiales.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
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
                <div className="flex items-end">
                  <Button type="button" variant="danger" size="sm" onClick={() => setMateriales((prev) => prev.filter((_, i) => i !== index))}>
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
            setMateriales((prev) => [...prev, { descripcion: "", unidad: "pza", cantidad: 1 }])
          }
        >
          + Material manual
        </Button>
      </Card>

      <Card>
        <Textarea
          label="Notas adicionales"
          name="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observaciones, recomendaciones..."
        />
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Fotos del trabajo</label>
          <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoCapture} className="text-sm" />
        </div>
        <div className="mt-4 flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar hoja de servicio"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </Card>
    </form>
  );
}

export default function NuevaHojaServicioPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Cargando...</p>}>
      <NuevaHojaServicioForm />
    </Suspense>
  );
}
