"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { calculateQuoteTotals, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";

export default function CotizacionesPage() {
  const quotes = useLiveQuery(() => db.quotes.orderBy("fecha").reverse().toArray()) ?? [];
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const clientMap = new Map(clients.map((c) => [c.id!, c.nombre]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Cotizaciones"
          subtitle="Presupuestos para instalaciones eléctricas"
          action={
            <Link href="/cotizaciones/nuevo">
              <Button>+ Nueva</Button>
            </Link>
          }
        />

        {quotes.length === 0 ? (
          <EmptyState
            title="Sin cotizaciones"
            description="Arma presupuestos con materiales del catálogo y mano de obra."
            action={
              <Link href="/cotizaciones/nuevo">
                <Button>Crear cotización</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => {
              const totals = calculateQuoteTotals(quote);
              return (
                <Link
                  key={quote.id}
                  href={`/cotizaciones/${quote.id}`}
                  className="block rounded-lg border border-slate-200 p-4 hover:border-brand-gold"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{quote.numero}</p>
                      <p className="text-sm text-slate-500">
                        {clientMap.get(quote.clientId) ?? "Cliente"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-brand-navy">
                        {formatCurrency(totals.total)}
                      </p>
                      <span className="text-xs capitalize text-slate-400">{quote.estado}</span>
                      <p className="text-xs text-slate-400">{formatDate(quote.fecha)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
