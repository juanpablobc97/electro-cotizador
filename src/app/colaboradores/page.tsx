"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import type { ColaboradorWithUser } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type ColaboradorForm = {
  nombre: string;
  puesto: string;
  sueldo: string;
  telefono: string;
  email: string;
  fechaIngreso: string;
  notas: string;
  activo: boolean;
};

const emptyForm: ColaboradorForm = {
  nombre: "",
  puesto: "",
  sueldo: "",
  telefono: "",
  email: "",
  fechaIngreso: "",
  notas: "",
  activo: true,
};

function toPayload(form: ColaboradorForm) {
  return {
    nombre: form.nombre,
    puesto: form.puesto,
    sueldo: form.sueldo ? Number(form.sueldo) : undefined,
    telefono: form.telefono || undefined,
    email: form.email || undefined,
    fechaIngreso: form.fechaIngreso || undefined,
    notas: form.notas || undefined,
    activo: form.activo,
  };
}

function colaboradorToRestoreRecord(c: ColaboradorWithUser) {
  return {
    id: c.id!,
    nombre: c.nombre,
    puesto: c.puesto,
    sueldo: c.sueldo ?? null,
    telefono: c.telefono ?? null,
    email: c.email ?? null,
    fechaIngreso: c.fechaIngreso
      ? c.fechaIngreso instanceof Date
        ? c.fechaIngreso.toISOString().slice(0, 10)
        : String(c.fechaIngreso).slice(0, 10)
      : null,
    notas: c.notas ?? null,
    activo: c.activo,
    userId: c.userId ?? null,
    createdAt:
      c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    updatedAt:
      c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
  };
}

async function cacheColaboradores(records: ColaboradorWithUser[]) {
  await db.transaction("rw", db.colaboradoresCache, async () => {
    await db.colaboradoresCache.clear();
    if (records.length === 0) return;
    await db.colaboradoresCache.bulkPut(
      records.map((c) => ({
        ...c,
        fechaIngreso: c.fechaIngreso ? new Date(c.fechaIngreso) : undefined,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
    );
  });
}

export default function ColaboradoresPage() {
  const router = useRouter();
  const { permissions, loading: sessionLoading } = useSession();
  const [colaboradores, setColaboradores] = useState<ColaboradorWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ColaboradorForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadColaboradores = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/colaboradores");
    if (res.status === 403) {
      router.replace("/");
      return;
    }
    if (!res.ok) {
      setError("No se pudo cargar la lista de colaboradores");
      setLoading(false);
      return;
    }
    let data = await res.json();
    let list: ColaboradorWithUser[] = data.colaboradores;

    if (list.length === 0) {
      const cached = await db.colaboradoresCache.toArray();
      if (cached.length > 0) {
        const restoreRes = await fetch("/api/colaboradores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restore",
            records: cached.map(colaboradorToRestoreRecord),
          }),
        });
        if (restoreRes.ok) {
          data = await restoreRes.json();
          list = data.colaboradores;
        }
      }
    }

    setColaboradores(list);
    await cacheColaboradores(list);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!permissions?.canManageColaboradores) {
      router.replace("/");
      return;
    }
    loadColaboradores();
  }, [sessionLoading, permissions, loadColaboradores, router]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = toPayload(form);
    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? { action: "update", id: editingId, ...payload }
          : { action: "create", ...payload },
      ),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      setSaving(false);
      return;
    }

    resetForm();
    await loadColaboradores();
    setSaving(false);
  }

  function startEdit(colaborador: ColaboradorWithUser) {
    setEditingId(colaborador.id!);
    setForm({
      nombre: colaborador.nombre,
      puesto: colaborador.puesto,
      sueldo: colaborador.sueldo != null ? String(colaborador.sueldo) : "",
      telefono: colaborador.telefono ?? "",
      email: colaborador.email ?? "",
      fechaIngreso: colaborador.fechaIngreso
        ? new Date(colaborador.fechaIngreso).toISOString().slice(0, 10)
        : "",
      notas: colaborador.notas ?? "",
      activo: colaborador.activo,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCreateUser(colaborador: ColaboradorWithUser) {
    const username = prompt(`Usuario de acceso para ${colaborador.nombre}:`);
    if (!username) return;
    const password = prompt("Contraseña (mínimo 4 caracteres):");
    if (!password || password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-user",
        id: colaborador.id,
        username,
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el usuario");
      return;
    }
    setError("");
    await loadColaboradores();
  }

  async function handleResetPassword(colaborador: ColaboradorWithUser) {
    const password = prompt(`Nueva contraseña para "${colaborador.username}" (mínimo 4 caracteres):`);
    if (!password) return;
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password", id: colaborador.id, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo restablecer la contraseña");
      return;
    }
    setError("");
    alert("Contraseña actualizada");
  }

  async function handleToggleCatalogPrices(colaborador: ColaboradorWithUser, enabled: boolean) {
    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set-catalog-prices",
        id: colaborador.id,
        enabled,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar el permiso");
      return;
    }
    setError("");
    await loadColaboradores();
  }

  async function handleDelete(colaborador: ColaboradorWithUser) {
    if (!confirm(`¿Eliminar el registro de ${colaborador.nombre}?`)) return;

    let removeUser = false;
    if (colaborador.userId) {
      removeUser = confirm("¿También eliminar su usuario de acceso a la app?");
    }

    const res = await fetch("/api/colaboradores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        id: colaborador.id,
        removeUser: Boolean(colaborador.userId && removeUser),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    if (editingId === colaborador.id) resetForm();
    await loadColaboradores();
  }

  if (sessionLoading || !permissions?.canManageColaboradores) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Colaboradores"
          subtitle="Registro interno del personal y accesos a la app"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              {editingId ? "Editar colaborador" : "Nuevo colaborador"}
            </h3>
            {editingId && (
              <Button type="button" size="sm" variant="secondary" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre completo *"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
            />
            <Input
              label="Puesto *"
              value={form.puesto}
              onChange={(e) => setForm((prev) => ({ ...prev, puesto: e.target.value }))}
              required
              placeholder="Electricista, ayudante..."
            />
            <Input
              label="Sueldo mensual"
              type="number"
              min={0}
              step="0.01"
              value={form.sueldo}
              onChange={(e) => setForm((prev) => ({ ...prev, sueldo: e.target.value }))}
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            />
            <Input
              label="Correo"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              label="Fecha de ingreso"
              type="date"
              value={form.fechaIngreso}
              onChange={(e) => setForm((prev) => ({ ...prev, fechaIngreso: e.target.value }))}
            />
          </div>

          <Textarea
            label="Notas internas"
            value={form.notas}
            onChange={(e) => setForm((prev) => ({ ...prev, notas: e.target.value }))}
            placeholder="Datos adicionales, emergencia, observaciones..."
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
            />
            Colaborador activo
          </label>

          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar colaborador"}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : colaboradores.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay colaboradores registrados.</p>
        ) : (
          <div className="space-y-3">
            {colaboradores.map((colaborador) => (
              <div key={colaborador.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {colaborador.nombre}
                      {!colaborador.activo && (
                        <span className="ml-2 text-xs font-normal text-slate-500">(inactivo)</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">{colaborador.puesto || "Sin puesto"}</p>
                    <dl className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                      {colaborador.sueldo != null && (
                        <div>
                          <span className="text-slate-500">Sueldo: </span>
                          {formatCurrency(colaborador.sueldo)}
                        </div>
                      )}
                      {colaborador.telefono && (
                        <div>
                          <span className="text-slate-500">Tel: </span>
                          {colaborador.telefono}
                        </div>
                      )}
                      {colaborador.email && (
                        <div>
                          <span className="text-slate-500">Correo: </span>
                          {colaborador.email}
                        </div>
                      )}
                      {colaborador.fechaIngreso && (
                        <div>
                          <span className="text-slate-500">Ingreso: </span>
                          {formatDate(colaborador.fechaIngreso)}
                        </div>
                      )}
                    </dl>
                    {colaborador.notas && (
                      <p className="mt-2 text-sm text-slate-600">{colaborador.notas}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {colaborador.username
                        ? `Acceso app: ${colaborador.username}`
                        : "Sin acceso a la app"}
                    </p>
                    {colaborador.username && (
                      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(colaborador.canEditCatalogPrices)}
                          onChange={(e) =>
                            handleToggleCatalogPrices(colaborador, e.target.checked)
                          }
                        />
                        Puede actualizar precios del catálogo
                      </label>
                    )}
                    {colaborador.username && colaborador.canEditCatalogPrices && (
                      <p className="mt-1 text-xs text-amber-700">
                        El colaborador debe recargar la app para que aplique el permiso.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(colaborador)}>
                      Editar
                    </Button>
                    {!colaborador.username ? (
                      <Button size="sm" onClick={() => handleCreateUser(colaborador)}>
                        Crear acceso
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleResetPassword(colaborador)}>
                        Nueva contraseña
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleDelete(colaborador)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Permisos de colaborador en la app" />
        <ul className="list-inside list-disc space-y-2 text-sm text-slate-600">
          <li>Ver y agregar clientes, levantamientos, cotizaciones y hojas de servicio.</li>
          <li>Editar registros existentes, pero <strong>no eliminar</strong> nada.</li>
          <li>Consultar el catálogo de materiales para cotizar.</li>
          <li>
            Si lo autorizas, ciertos colaboradores pueden <strong>actualizar precios</strong> del
            catálogo (sin agregar ni eliminar materiales).
          </li>
          <li>Sin acceso a este apartado de colaboradores ni al inventario de herramienta (próximamente).</li>
        </ul>
      </Card>
    </div>
  );
}
