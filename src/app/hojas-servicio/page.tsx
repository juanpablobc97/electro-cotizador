"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { SERVICE_TYPE_LABELS, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";

export default function HojasServicioPage() {
  const sheets =
    useLiveQuery(() => db.serviceSheets.orderBy("fecha").reverse().toArray()) ?? [];
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const clientMap = new Map(clients.map((c) => [c.id!, c.nombre]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Hojas de servicio"
          subtitle="Registro de trabajos realizados y comprobantes de garantía"
          action={
            <Link href="/hojas-servicio/nuevo">
              <Button>+ Nueva</Button>
            </Link>
          }
        />

        {sheets.length === 0 ? (
          <EmptyState
            title="Sin hojas de servicio"
            description="Registra cada instalación, reparación o mantenimiento para llevar control de garantías y enviar comprobante al cliente."
            action={
              <Link href="/hojas-servicio/nuevo">
                <Button>Crear hoja de servicio</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {sheets.map((sheet) => (
              <Link
                key={sheet.id}
                href={`/hojas-servicio/${sheet.id}`}
                className="block rounded-lg border border-slate-200 p-4 hover:border-brand-gold"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{sheet.numero}</p>
                    <p className="text-sm text-slate-500">
                      {clientMap.get(sheet.clientId) ?? "Cliente"} ·{" "}
                      {SERVICE_TYPE_LABELS[sheet.tipoServicio]}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {sheet.descripcionTrabajo}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-brand-gold-light px-2 py-0.5 text-xs font-medium text-brand-navy">
                      {sheet.garantiaMeses} meses
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(sheet.fecha)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
