"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  categoriesForTipo,
  CATEGORY_LABELS,
  COLLABORATOR_PAYMENT_LABELS,
  defaultCategoryForTipo,
  PAYMENT_METHOD_LABELS,
  suggestsQuoteLink,
  TIPO_LABELS,
} from "@/lib/finance-labels";
import type {
  ColaboradorWithUser,
  CollaboratorPaymentType,
  FinanceCategory,
  FinanceMovementType,
  FinanceMovementWithRefs,
  FinanceSummary,
  PaymentMethod,
} from "@/lib/types";
import { calculateQuoteTotals, formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type MovementForm = {
  tipo: FinanceMovementType;
  categoria: FinanceCategory;
  monto: string;
  fecha: string;
  concepto: string;
  formaPago: PaymentMethod;
  clientId: string;
  quoteId: string;
  colaboradorId: string;
  colaboradorPaymentType: CollaboratorPaymentType;
  notas: string;
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyForm(tipo: FinanceMovementType = "ingreso"): MovementForm {
  return {
    tipo,
    categoria: defaultCategoryForTipo(tipo),
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    concepto: "",
    formaPago: "efectivo",
    clientId: "",
    quoteId: "",
    colaboradorId: "",
    colaboradorPaymentType: "por_obra",
    notas: "",
  };
}

function movementToForm(m: FinanceMovementWithRefs): MovementForm {
  return {
    tipo: m.tipo,
    categoria: m.categoria,
    monto: String(m.monto),
    fecha: new Date(m.fecha).toISOString().slice(0, 10),
    concepto: m.concepto,
    formaPago: m.formaPago,
    clientId: m.clientId ? String(m.clientId) : "",
    quoteId: m.quoteId ? String(m.quoteId) : "",
    colaboradorId: m.colaboradorId ? String(m.colaboradorId) : "",
    colaboradorPaymentType: m.colaboradorPaymentType ?? "por_obra",
    notas: m.notas ?? "",
  };
}

export default function FinanzasPage() {
  const router = useRouter();
  const { permissions, loading: sessionLoading } = useSession();
  const [month, setMonth] = useState(currentMonth);
  const [movements, setMovements] = useState<FinanceMovementWithRefs[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({ ingresos: 0, egresos: 0, balance: 0 });
  const [colaboradores, setColaboradores] = useState<ColaboradorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MovementForm>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);

  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];
  const quotes = useLiveQuery(() => db.quotes.orderBy("fecha").reverse().toArray()) ?? [];

  const filteredQuotes = useMemo(() => {
    if (!form.clientId) return quotes;
    return quotes.filter((q) => String(q.clientId) === form.clientId);
  }, [quotes, form.clientId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/finanzas?month=${month}`);
    if (res.status === 403) {
      router.replace("/");
      return;
    }
    if (!res.ok) {
      setError("No se pudieron cargar los movimientos");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMovements(data.movements);
    setSummary(data.summary);
    setLoading(false);
  }, [month, router]);

  const loadColaboradores = useCallback(async () => {
    const res = await fetch("/api/colaboradores");
    if (!res.ok) return;
    const data = await res.json();
    setColaboradores(data.colaboradores ?? []);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!permissions?.canAccessFinanzas) {
      router.replace("/");
      return;
    }
    loadData();
    loadColaboradores();
  }, [sessionLoading, permissions, loadData, loadColaboradores, router]);

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  }

  function openCreate(tipo: FinanceMovementType) {
    setForm(emptyForm(tipo));
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(movement: FinanceMovementWithRefs) {
    setForm(movementToForm(movement));
    setEditingId(movement.id!);
    setShowForm(true);
  }

  function handleTipoChange(tipo: FinanceMovementType) {
    setForm((prev) => ({
      ...prev,
      tipo,
      categoria: defaultCategoryForTipo(tipo),
      colaboradorId: tipo === "egreso" ? prev.colaboradorId : "",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (suggestsQuoteLink(form.tipo, form.categoria) && !form.quoteId) {
      const proceed = confirm(
        "Este movimiento no está vinculado a una cotización. No aparecerá en la utilidad por obra de Obras. ¿Guardar de todos modos?",
      );
      if (!proceed) {
        setSaving(false);
        return;
      }
    }

    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      monto: Number(form.monto),
      fecha: form.fecha,
      concepto: form.concepto,
      formaPago: form.formaPago,
      clientId: form.clientId ? Number(form.clientId) : undefined,
      quoteId: form.quoteId ? Number(form.quoteId) : undefined,
      colaboradorId: form.colaboradorId ? Number(form.colaboradorId) : undefined,
      colaboradorPaymentType:
        form.categoria === "pago_colaborador" ? form.colaboradorPaymentType : undefined,
      notas: form.notas || undefined,
    };

    const res = await fetch("/api/finanzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId ? { action: "update", id: editingId, ...payload } : { action: "create", ...payload },
      ),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      setSaving(false);
      return;
    }

    resetForm();
    await loadData();
    setSaving(false);
  }

  async function handleDelete(id: number, concepto: string) {
    if (!confirm(`¿Eliminar el movimiento "${concepto}"?`)) return;

    const res = await fetch("/api/finanzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    if (editingId === id) resetForm();
    await loadData();
  }

  if (sessionLoading || !permissions?.canAccessFinanzas) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Finanzas"
          subtitle="Registro de ingresos, egresos y pagos a colaboradores"
          action={
            <div className="w-40">
              <Input
                label="Mes"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">Ingresos</p>
            <p className="text-2xl font-bold text-emerald-900">{formatCurrency(summary.ingresos)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Egresos</p>
            <p className="text-2xl font-bold text-red-900">{formatCurrency(summary.egresos)}</p>
          </div>
          <div className="rounded-xl bg-brand-gold-light p-4">
            <p className="text-sm font-medium text-brand-navy">Balance del mes</p>
            <p className="text-2xl font-bold text-brand-navy">{formatCurrency(summary.balance)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => openCreate("ingreso")}>+ Ingreso</Button>
          <Button variant="secondary" onClick={() => openCreate("egreso")}>
            + Egreso
          </Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Editar movimiento" : `Nuevo ${TIPO_LABELS[form.tipo].toLowerCase()}`}
              </h3>
              <Button type="button" size="sm" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Tipo *"
                value={form.tipo}
                onChange={(e) => handleTipoChange(e.target.value as FinanceMovementType)}
                options={[
                  { value: "ingreso", label: "Ingreso" },
                  { value: "egreso", label: "Egreso" },
                ]}
              />
              <Select
                label="Categoría *"
                value={form.categoria}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, categoria: e.target.value as FinanceCategory }))
                }
                options={categoriesForTipo(form.tipo).map((c) => ({
                  value: c,
                  label: CATEGORY_LABELS[c],
                }))}
              />
              <Input
                label="Monto *"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.monto}
                onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
              />
              <Input
                label="Fecha *"
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
              />
              <Input
                label="Concepto *"
                required
                value={form.concepto}
                onChange={(e) => setForm((prev) => ({ ...prev, concepto: e.target.value }))}
                className="sm:col-span-2"
                placeholder="Anticipo instalación, pago a Juan por 3 días..."
              />
              <Select
                label="Forma de pago"
                value={form.formaPago}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, formaPago: e.target.value as PaymentMethod }))
                }
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Select
                label="Cliente (opcional)"
                value={form.clientId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, clientId: e.target.value, quoteId: "" }))
                }
                options={[
                  { value: "", label: "Sin cliente" },
                  ...clients.map((c) => ({ value: String(c.id), label: c.nombre })),
                ]}
              />
              <Select
                label={
                  suggestsQuoteLink(form.tipo, form.categoria)
                    ? "Cotización (recomendado)"
                    : "Cotización (opcional)"
                }
                value={form.quoteId}
                onChange={(e) => setForm((prev) => ({ ...prev, quoteId: e.target.value }))}
                options={[
                  { value: "", label: "Sin cotización" },
                  ...filteredQuotes.map((q) => ({
                    value: String(q.id),
                    label: `${q.numero} — ${formatCurrency(calculateQuoteTotals(q).total)}`,
                  })),
                ]}
              />
              {suggestsQuoteLink(form.tipo, form.categoria) && !form.quoteId && (
                <p className="sm:col-span-2 text-sm text-amber-700">
                  Vincula la cotización para que este movimiento cuente en la utilidad por obra.
                </p>
              )}

              {form.categoria === "pago_colaborador" && (
                <>
                  <Select
                    label="Colaborador *"
                    value={form.colaboradorId}
                    onChange={(e) => setForm((prev) => ({ ...prev, colaboradorId: e.target.value }))}
                    options={[
                      { value: "", label: "Seleccionar..." },
                      ...colaboradores
                        .filter((c) => c.activo)
                        .map((c) => ({ value: String(c.id), label: c.nombre })),
                    ]}
                  />
                  <Select
                    label="Tipo de pago"
                    value={form.colaboradorPaymentType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        colaboradorPaymentType: e.target.value as CollaboratorPaymentType,
                      }))
                    }
                    options={Object.entries(COLLABORATOR_PAYMENT_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </>
              )}
            </div>

            <Textarea
              label="Notas"
              value={form.notas}
              onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
              placeholder="Detalles adicionales..."
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar movimiento"}
            </Button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Cargando movimientos...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay movimientos en este mes. Empieza registrando un ingreso o egreso.
          </p>
        ) : (
          <div className="space-y-2">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        movement.tipo === "ingreso"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {TIPO_LABELS[movement.tipo]}
                    </span>
                    <span className="text-xs text-slate-500">{CATEGORY_LABELS[movement.categoria]}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-900">{movement.concepto}</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(movement.fecha)} · {PAYMENT_METHOD_LABELS[movement.formaPago]}
                  </p>
                  {(movement.clientNombre || movement.colaboradorNombre || movement.quoteNumero) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {movement.clientNombre && `Cliente: ${movement.clientNombre}`}
                      {movement.quoteNumero && ` · Cotización: ${movement.quoteNumero}`}
                      {movement.colaboradorNombre && ` · Colaborador: ${movement.colaboradorNombre}`}
                      {movement.colaboradorPaymentType &&
                        ` (${COLLABORATOR_PAYMENT_LABELS[movement.colaboradorPaymentType]})`}
                    </p>
                  )}
                  {movement.notas && (
                    <p className="mt-1 text-sm text-slate-600">{movement.notas}</p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <p
                    className={`text-lg font-bold ${
                      movement.tipo === "ingreso" ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {movement.tipo === "ingreso" ? "+" : "−"}
                    {formatCurrency(movement.monto)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(movement)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(movement.id!, movement.concepto)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
