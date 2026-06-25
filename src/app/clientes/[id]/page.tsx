"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { formatDate, SERVICE_TYPE_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const client = useLiveQuery(() => db.clients.get(id), [id]);
  const surveys = useLiveQuery(
    () => db.surveys.where("clientId").equals(id).reverse().sortBy("fecha"),
    [id],
  );
  const quotes = useLiveQuery(
    () => db.quotes.where("clientId").equals(id).reverse().sortBy("fecha"),
    [id],
  );
  const serviceSheets = useLiveQuery(
    () => db.serviceSheets.where("clientId").equals(id).reverse().sortBy("fecha"),
    [id],
  );

  if (client === undefined) return <p className="text-slate-500">Cargando...</p>;
  if (!client) return <p className="text-slate-500">Cliente no encontrado.</p>;

  async function handleUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);

    await dataStore.clients.update(id, {
      nombre: String(form.get("nombre")),
      empresa: String(form.get("empresa") || "") || undefined,
      telefono: String(form.get("telefono")),
      email: String(form.get("email") || "") || undefined,
      direccion: String(form.get("direccion")),
      notas: String(form.get("notas") || "") || undefined,
      updatedAt: new Date(),
    });

    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este cliente? También se eliminarán sus levantamientos, cotizaciones y hojas de servicio.")) {
      return;
    }
    await dataStore.clients.delete(id);
    router.push("/clientes");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={client.nombre}
          subtitle={client.empresa ?? "Cliente"}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(!editing)}>
                {editing ? "Cancelar" : "Editar"}
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          }
        />

        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input label="Nombre" name="nombre" defaultValue={client.nombre} required />
            <Input label="Empresa" name="empresa" defaultValue={client.empresa ?? ""} />
            <Input label="Teléfono" name="telefono" defaultValue={client.telefono} required />
            <Input label="Correo" name="email" type="email" defaultValue={client.email ?? ""} />
            <Input label="Dirección" name="direccion" defaultValue={client.direccion} required />
            <Textarea label="Notas" name="notas" defaultValue={client.notas ?? ""} />
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="font-medium">{client.telefono}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Correo</dt>
              <dd className="font-medium">{client.email ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Dirección</dt>
              <dd className="font-medium">{client.direccion}</dd>
            </div>
            {client.notas && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Notas</dt>
                <dd className="font-medium">{client.notas}</dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Levantamientos"
          action={
            <Link href={`/levantamientos/nuevo?clientId=${id}`}>
              <Button size="sm">+ Nuevo</Button>
            </Link>
          }
        />
        {(surveys ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Sin levantamientos registrados.</p>
        ) : (
          <div className="space-y-2">
            {(surveys ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/levantamientos/${s.id}`}
                className="block rounded-lg border p-3 hover:bg-slate-50"
              >
                <p className="font-medium">{s.titulo}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(s.fecha)} · {s.estado}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Cotizaciones"
          action={
            <Link href={`/cotizaciones/nuevo?clientId=${id}`}>
              <Button size="sm">+ Nueva</Button>
            </Link>
          }
        />
        {(quotes ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Sin cotizaciones registradas.</p>
        ) : (
          <div className="space-y-2">
            {(quotes ?? []).map((q) => (
              <Link
                key={q.id}
                href={`/cotizaciones/${q.id}`}
                className="block rounded-lg border p-3 hover:bg-slate-50"
              >
                <p className="font-medium">{q.numero}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(q.fecha)} · {q.estado}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Hojas de servicio"
          action={
            <Link href={`/hojas-servicio/nuevo?clientId=${id}`}>
              <Button size="sm">+ Nueva</Button>
            </Link>
          }
        />
        {(serviceSheets ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Sin hojas de servicio registradas.</p>
        ) : (
          <div className="space-y-2">
            {(serviceSheets ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/hojas-servicio/${s.id}`}
                className="block rounded-lg border p-3 hover:bg-slate-50"
              >
                <p className="font-medium">{s.numero}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(s.fecha)} · {SERVICE_TYPE_LABELS[s.tipoServicio]} ·{" "}
                  {s.garantiaMeses} meses garantía
                </p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
