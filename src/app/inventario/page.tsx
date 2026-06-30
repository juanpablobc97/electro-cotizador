"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  INVENTORY_ESTADO_LABELS,
  INVENTORY_ESTADO_OPTIONS,
  INVENTORY_EVENT_LABELS,
  INVENTORY_TIPO_LABELS,
} from "@/lib/inventory-labels";
import type {
  ColaboradorWithUser,
  InventoryEventType,
  InventoryEventWithRefs,
  InventoryItemStatus,
  InventoryItemType,
  InventoryItemWithRefs,
  InventorySummary,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Tab = InventoryItemType;

type ItemForm = {
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  placa: string;
  kmActual: string;
  colaboradorId: string;
  fechaAdquisicion: string;
  costo: string;
  estado: InventoryItemStatus;
  proximoServicioKm: string;
  proximoServicioFecha: string;
  notas: string;
};

type EventForm = {
  tipo: InventoryEventType;
  fecha: string;
  descripcion: string;
  colaboradorId: string;
  km: string;
  costo: string;
  notas: string;
};

function emptyItemForm(): ItemForm {
  return {
    nombre: "",
    descripcion: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
    placa: "",
    kmActual: "",
    colaboradorId: "",
    fechaAdquisicion: "",
    costo: "",
    estado: "activo",
    proximoServicioKm: "",
    proximoServicioFecha: "",
    notas: "",
  };
}

function itemToForm(item: InventoryItemWithRefs): ItemForm {
  return {
    nombre: item.nombre,
    descripcion: item.descripcion ?? "",
    marca: item.marca ?? "",
    modelo: item.modelo ?? "",
    numeroSerie: item.numeroSerie ?? "",
    placa: item.placa ?? "",
    kmActual: item.kmActual != null ? String(item.kmActual) : "",
    colaboradorId: item.colaboradorId ? String(item.colaboradorId) : "",
    fechaAdquisicion: item.fechaAdquisicion
      ? new Date(item.fechaAdquisicion).toISOString().slice(0, 10)
      : "",
    costo: item.costo != null ? String(item.costo) : "",
    estado: item.estado,
    proximoServicioKm: item.proximoServicioKm != null ? String(item.proximoServicioKm) : "",
    proximoServicioFecha: item.proximoServicioFecha
      ? new Date(item.proximoServicioFecha).toISOString().slice(0, 10)
      : "",
    notas: item.notas ?? "",
  };
}

function emptyEventForm(tipo: InventoryEventType = "nota"): EventForm {
  return {
    tipo,
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: "",
    colaboradorId: "",
    km: "",
    costo: "",
    notas: "",
  };
}

const EVENT_OPTIONS = Object.entries(INVENTORY_EVENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function InventarioPage() {
  const router = useRouter();
  const { permissions, loading: sessionLoading } = useSession();
  const [tab, setTab] = useState<Tab>("herramienta");
  const [items, setItems] = useState<InventoryItemWithRefs[]>([]);
  const [events, setEvents] = useState<InventoryEventWithRefs[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    herramientas: 0,
    vehiculos: 0,
    asignadas: 0,
    enReparacion: 0,
  });
  const [colaboradores, setColaboradores] = useState<ColaboradorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm());
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm());

  const filteredItems = useMemo(
    () => items.filter((item) => item.tipo === tab),
    [items, tab],
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const itemEvents = useMemo(
    () => events.filter((event) => event.itemId === selectedId),
    [events, selectedId],
  );

  const colaboradorOptions = useMemo(
    () =>
      colaboradores
        .filter((c) => c.activo)
        .map((c) => ({ value: String(c.id), label: c.nombre })),
    [colaboradores],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/inventario");
    if (res.status === 403) {
      router.replace("/");
      return;
    }
    if (!res.ok) {
      setError("No se pudo cargar el inventario");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.items);
    setEvents(data.events);
    setSummary(data.summary);
    setLoading(false);
  }, [router]);

  const loadColaboradores = useCallback(async () => {
    const res = await fetch("/api/colaboradores");
    if (!res.ok) return;
    const data = await res.json();
    setColaboradores(data.colaboradores ?? []);
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!permissions?.canAccessInventario) {
      router.replace("/");
      return;
    }
    loadData();
    loadColaboradores();
  }, [sessionLoading, permissions, loadData, loadColaboradores, router]);

  function resetItemForm() {
    setItemForm(emptyItemForm());
    setEditingItemId(null);
    setShowItemForm(false);
  }

  function openCreateItem() {
    setItemForm(emptyItemForm());
    setEditingItemId(null);
    setShowItemForm(true);
  }

  function openEditItem(item: InventoryItemWithRefs) {
    setItemForm(itemToForm(item));
    setEditingItemId(item.id!);
    setShowItemForm(true);
  }

  function resetEventForm() {
    setEventForm(emptyEventForm(selectedItem?.tipo === "vehiculo" ? "km" : "asignacion"));
    setShowEventForm(false);
  }

  function openCreateEvent(tipo?: InventoryEventType) {
    if (!selectedItem) return;
    const defaultTipo =
      tipo ?? (selectedItem.tipo === "vehiculo" ? "km" : selectedItem.colaboradorId ? "devolucion" : "asignacion");
    setEventForm(emptyEventForm(defaultTipo));
    setShowEventForm(true);
  }

  async function handleItemSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      tipo: tab,
      nombre: itemForm.nombre,
      descripcion: itemForm.descripcion || undefined,
      marca: itemForm.marca || undefined,
      modelo: itemForm.modelo || undefined,
      numeroSerie: itemForm.numeroSerie || undefined,
      placa: itemForm.placa || undefined,
      kmActual: itemForm.kmActual ? Number(itemForm.kmActual) : undefined,
      colaboradorId: itemForm.colaboradorId ? Number(itemForm.colaboradorId) : undefined,
      fechaAdquisicion: itemForm.fechaAdquisicion || undefined,
      costo: itemForm.costo ? Number(itemForm.costo) : undefined,
      estado: itemForm.estado,
      proximoServicioKm: itemForm.proximoServicioKm ? Number(itemForm.proximoServicioKm) : undefined,
      proximoServicioFecha: itemForm.proximoServicioFecha || undefined,
      notas: itemForm.notas || undefined,
    };

    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingItemId
          ? { action: "update_item", id: editingItemId, ...payload }
          : { action: "create_item", ...payload },
      ),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      setSaving(false);
      return;
    }

    resetItemForm();
    const newId = data.item?.id ?? selectedId;
    if (newId) setSelectedId(newId);
    await loadData();
    setSaving(false);
  }

  async function handleDeleteItem(item: InventoryItemWithRefs) {
    if (!confirm(`¿Eliminar "${item.nombre}" del inventario?`)) return;

    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_item", id: item.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    if (selectedId === item.id) setSelectedId(null);
    await loadData();
  }

  async function handleEventSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedItem?.id) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_event",
        itemId: selectedItem.id,
        tipo: eventForm.tipo,
        fecha: eventForm.fecha,
        descripcion: eventForm.descripcion,
        colaboradorId: eventForm.colaboradorId ? Number(eventForm.colaboradorId) : undefined,
        km: eventForm.km ? Number(eventForm.km) : undefined,
        costo: eventForm.costo ? Number(eventForm.costo) : undefined,
        notas: eventForm.notas || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el evento");
      setSaving(false);
      return;
    }

    resetEventForm();
    await loadData();
    setSaving(false);
  }

  async function handleDeleteEvent(event: InventoryEventWithRefs) {
    if (!confirm("¿Eliminar este registro del historial?")) return;

    const res = await fetch("/api/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_event", id: event.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    await loadData();
  }

  if (sessionLoading || !permissions?.canAccessInventario) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Inventario"
          subtitle="Herramientas, equipos y vehículos de la empresa"
          action={
            <Button variant="secondary" size="sm" onClick={() => loadData()}>
              Actualizar
            </Button>
          }
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">Herramientas</p>
            <p className="text-2xl font-bold text-blue-900">{summary.herramientas}</p>
          </div>
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="text-sm font-medium text-teal-800">Vehículos</p>
            <p className="text-2xl font-bold text-teal-900">{summary.vehiculos}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Asignadas</p>
            <p className="text-2xl font-bold text-amber-900">{summary.asignadas}</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-800">En reparación</p>
            <p className="text-2xl font-bold text-orange-900">{summary.enReparacion}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["herramienta", "vehiculo"] as Tab[]).map((tipo) => (
            <Button
              key={tipo}
              variant={tab === tipo ? "primary" : "secondary"}
              onClick={() => {
                setTab(tipo);
                setSelectedId(null);
                resetItemForm();
                resetEventForm();
              }}
            >
              {INVENTORY_TIPO_LABELS[tipo]}s
            </Button>
          ))}
          <Button onClick={openCreateItem}>+ Agregar {INVENTORY_TIPO_LABELS[tab].toLowerCase()}</Button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {showItemForm && (
          <form onSubmit={handleItemSubmit} className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingItemId ? "Editar" : "Nueva"} {INVENTORY_TIPO_LABELS[tab].toLowerCase()}
              </h3>
              <Button type="button" size="sm" variant="secondary" onClick={resetItemForm}>
                Cancelar
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nombre *"
                value={itemForm.nombre}
                onChange={(e) => setItemForm((prev) => ({ ...prev, nombre: e.target.value }))}
                required
              />
              <Select
                label="Estado"
                value={itemForm.estado}
                onChange={(e) =>
                  setItemForm((prev) => ({
                    ...prev,
                    estado: e.target.value as InventoryItemStatus,
                  }))
                }
                options={INVENTORY_ESTADO_OPTIONS}
              />
              <Input
                label="Marca"
                value={itemForm.marca}
                onChange={(e) => setItemForm((prev) => ({ ...prev, marca: e.target.value }))}
              />
              <Input
                label="Modelo"
                value={itemForm.modelo}
                onChange={(e) => setItemForm((prev) => ({ ...prev, modelo: e.target.value }))}
              />
              {tab === "herramienta" ? (
                <>
                  <Input
                    label="Número de serie"
                    value={itemForm.numeroSerie}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, numeroSerie: e.target.value }))}
                  />
                  <Select
                    label="Asignado a"
                    value={itemForm.colaboradorId}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, colaboradorId: e.target.value }))
                    }
                    options={[{ value: "", label: "Sin asignar" }, ...colaboradorOptions]}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Placa"
                    value={itemForm.placa}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, placa: e.target.value }))}
                  />
                  <Input
                    label="Km actual"
                    type="number"
                    min="0"
                    value={itemForm.kmActual}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, kmActual: e.target.value }))}
                  />
                  <Input
                    label="Próximo servicio (km)"
                    type="number"
                    min="0"
                    value={itemForm.proximoServicioKm}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, proximoServicioKm: e.target.value }))
                    }
                  />
                  <Input
                    label="Próximo servicio (fecha)"
                    type="date"
                    value={itemForm.proximoServicioFecha}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, proximoServicioFecha: e.target.value }))
                    }
                  />
                </>
              )}
              <Input
                label="Fecha de adquisición"
                type="date"
                value={itemForm.fechaAdquisicion}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, fechaAdquisicion: e.target.value }))
                }
              />
              <Input
                label="Costo"
                type="number"
                min="0"
                step="0.01"
                value={itemForm.costo}
                onChange={(e) => setItemForm((prev) => ({ ...prev, costo: e.target.value }))}
              />
            </div>
            <Textarea
              label="Notas"
              value={itemForm.notas}
              onChange={(e) => setItemForm((prev) => ({ ...prev, notas: e.target.value }))}
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay {INVENTORY_TIPO_LABELS[tab].toLowerCase()}s registrados.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const active = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id!);
                      resetEventForm();
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      active ? "border-brand-gold bg-brand-gold-light" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{item.nombre}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.marca || item.placa
                            ? [item.marca, item.modelo, item.placa].filter(Boolean).join(" · ")
                            : "Sin detalles"}
                        </p>
                        {item.colaboradorNombre && (
                          <p className="mt-1 text-xs text-slate-500">Asignado: {item.colaboradorNombre}</p>
                        )}
                        {item.kmActual != null && (
                          <p className="mt-1 text-xs text-slate-500">{item.kmActual.toLocaleString()} km</p>
                        )}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {INVENTORY_ESTADO_LABELS[item.estado]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {!selectedItem ? (
                <p className="text-sm text-slate-500">Selecciona un artículo para ver detalle e historial.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedItem.nombre}</h3>
                      <p className="text-sm text-slate-600">
                        {INVENTORY_ESTADO_LABELS[selectedItem.estado]}
                        {selectedItem.colaboradorNombre && ` · ${selectedItem.colaboradorNombre}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEditItem(selectedItem)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(selectedItem)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {selectedItem.numeroSerie && (
                      <>
                        <dt className="text-slate-500">Serie</dt>
                        <dd>{selectedItem.numeroSerie}</dd>
                      </>
                    )}
                    {selectedItem.placa && (
                      <>
                        <dt className="text-slate-500">Placa</dt>
                        <dd>{selectedItem.placa}</dd>
                      </>
                    )}
                    {selectedItem.kmActual != null && (
                      <>
                        <dt className="text-slate-500">Km actual</dt>
                        <dd>{selectedItem.kmActual.toLocaleString()} km</dd>
                      </>
                    )}
                    {selectedItem.proximoServicioKm != null && (
                      <>
                        <dt className="text-slate-500">Próximo servicio</dt>
                        <dd>
                          {selectedItem.proximoServicioKm.toLocaleString()} km
                          {selectedItem.proximoServicioFecha &&
                            ` · ${formatDate(selectedItem.proximoServicioFecha)}`}
                        </dd>
                      </>
                    )}
                    {selectedItem.costo != null && (
                      <>
                        <dt className="text-slate-500">Costo</dt>
                        <dd>{formatCurrency(selectedItem.costo)}</dd>
                      </>
                    )}
                  </dl>

                  {selectedItem.notas && (
                    <p className="text-sm text-slate-600">{selectedItem.notas}</p>
                  )}

                  <div className="border-t pt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-800">Historial</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.tipo === "herramienta" && (
                          <>
                            <Button size="sm" onClick={() => openCreateEvent("asignacion")}>
                              Asignar
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openCreateEvent("devolucion")}>
                              Devolver
                            </Button>
                          </>
                        )}
                        {selectedItem.tipo === "vehiculo" && (
                          <>
                            <Button size="sm" onClick={() => openCreateEvent("km")}>
                              Registrar km
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openCreateEvent("servicio")}>
                              Servicio
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openCreateEvent("reparacion")}>
                              Reparación
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openCreateEvent("nota")}>
                          Nota
                        </Button>
                      </div>
                    </div>

                    {showEventForm && (
                      <form onSubmit={handleEventSubmit} className="mb-4 space-y-3 rounded-lg border bg-slate-50 p-3">
                        <Select
                          label="Tipo *"
                          value={eventForm.tipo}
                          onChange={(e) =>
                            setEventForm((prev) => ({
                              ...prev,
                              tipo: e.target.value as InventoryEventType,
                            }))
                          }
                          options={EVENT_OPTIONS}
                        />
                        <Input
                          label="Fecha *"
                          type="date"
                          value={eventForm.fecha}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, fecha: e.target.value }))}
                          required
                        />
                        <Input
                          label="Descripción *"
                          value={eventForm.descripcion}
                          onChange={(e) =>
                            setEventForm((prev) => ({ ...prev, descripcion: e.target.value }))
                          }
                          required
                        />
                        {(eventForm.tipo === "asignacion" || eventForm.tipo === "devolucion") && (
                          <Select
                            label="Colaborador"
                            value={eventForm.colaboradorId}
                            onChange={(e) =>
                              setEventForm((prev) => ({ ...prev, colaboradorId: e.target.value }))
                            }
                            options={[{ value: "", label: "Seleccionar..." }, ...colaboradorOptions]}
                          />
                        )}
                        {(eventForm.tipo === "km" || eventForm.tipo === "servicio") && (
                          <Input
                            label="Kilometraje"
                            type="number"
                            min="0"
                            value={eventForm.km}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, km: e.target.value }))}
                          />
                        )}
                        {(eventForm.tipo === "servicio" || eventForm.tipo === "reparacion") && (
                          <Input
                            label="Costo"
                            type="number"
                            min="0"
                            step="0.01"
                            value={eventForm.costo}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, costo: e.target.value }))}
                          />
                        )}
                        <Textarea
                          label="Notas"
                          value={eventForm.notas}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, notas: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={saving}>
                            {saving ? "Guardando..." : "Registrar"}
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={resetEventForm}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}

                    {itemEvents.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin registros aún.</p>
                    ) : (
                      <ul className="space-y-2">
                        {itemEvents.map((event) => (
                          <li
                            key={event.id}
                            className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {INVENTORY_EVENT_LABELS[event.tipo]} — {event.descripcion}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(event.fecha)}
                                {event.colaboradorNombre && ` · ${event.colaboradorNombre}`}
                                {event.km != null && ` · ${event.km.toLocaleString()} km`}
                                {event.costo != null && ` · ${formatCurrency(event.costo)}`}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEvent(event)}>
                              ×
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
