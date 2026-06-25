"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";

export default function ClientesPage() {
  const clients = useLiveQuery(() => db.clients.orderBy("nombre").toArray()) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Cartera de clientes"
          subtitle={`${clients.length} cliente${clients.length !== 1 ? "s" : ""} registrado${clients.length !== 1 ? "s" : ""}`}
          action={
            <Link href="/clientes/nuevo">
              <Button>+ Nuevo</Button>
            </Link>
          }
        />

        {clients.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="Agrega tu primer cliente para comenzar a registrar levantamientos y cotizaciones."
            action={
              <Link href="/clientes/nuevo">
                <Button>Agregar cliente</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className="block rounded-lg border border-slate-200 p-4 transition hover:border-brand-gold hover:bg-brand-gold-light/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{client.nombre}</p>
                    {client.empresa && (
                      <p className="text-sm text-slate-500">{client.empresa}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">{client.telefono}</p>
                    <p className="text-sm text-slate-500">{client.direccion}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(client.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
