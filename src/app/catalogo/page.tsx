"use client";

import { FormEvent, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import type { MaterialUnit } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export default function CatalogoPage() {
  const { permissions } = useSession();
  const canManage = permissions?.canManageCatalog ?? false;
  const materials = useLiveQuery(() => db.materials.orderBy("categoria").toArray()) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const now = new Date();

    await dataStore.materials.create({
      codigo: String(form.get("codigo")),
      nombre: String(form.get("nombre")),
      unidad: form.get("unidad") as MaterialUnit,
      precioUnitario: Number(form.get("precioUnitario")),
      categoria: String(form.get("categoria")),
      createdAt: now,
      updatedAt: now,
    });

    setShowForm(false);
    setSaving(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este material del catálogo?")) return;
    await dataStore.materials.delete(id);
  }

  const grouped = materials.reduce<Record<string, typeof materials>>((acc, m) => {
    if (!acc[m.categoria]) acc[m.categoria] = [];
    acc[m.categoria].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Catálogo de materiales"
          subtitle="Precios reutilizables para cotizaciones"
          action={
            canManage ? (
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? "Cancelar" : "+ Agregar"}
              </Button>
            ) : undefined
          }
        />

        {canManage && showForm && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Código" name="codigo" required placeholder="CAB-THW12" />
              <Input label="Categoría" name="categoria" required placeholder="Cableado" />
              <Input label="Nombre" name="nombre" required className="sm:col-span-2" />
              <Select
                label="Unidad"
                name="unidad"
                options={[
                  { value: "pza", label: "Pieza" },
                  { value: "m", label: "Metro" },
                  { value: "rollo", label: "Rollo" },
                  { value: "kg", label: "Kilogramo" },
                  { value: "caja", label: "Caja" },
                ]}
              />
              <Input
                label="Precio unitario"
                name="precioUnitario"
                type="number"
                min={0}
                step="0.01"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar material"}
            </Button>
          </form>
        )}

        {materials.length === 0 ? (
          <EmptyState
            title="Catálogo vacío"
            description="Agrega materiales con sus precios para armar cotizaciones más rápido."
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([categoria, items]) => (
              <div key={categoria}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {categoria}
                </h3>
                <div className="space-y-2">
                  {items.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{material.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {material.codigo} · {formatCurrency(material.precioUnitario)}/
                          {material.unidad}
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(material.id!)}
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
