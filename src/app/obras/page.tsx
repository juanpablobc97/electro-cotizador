"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OBRA_ETAPA_LABELS, OBRA_ETAPA_ORDER } from "@/lib/obras";
import type { ObraEtapa, ObraItem, ObrasDashboard } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

const ETAPA_COLORS: Record<ObraEtapa, string> = {
  levantamiento: "border-amber-200 bg-amber-50",
  cotizada: "border-blue-200 bg-blue-50",
  aceptada: "border-violet-200 bg-violet-50",
  en_obra: "border-teal-200 bg-teal-50",
  cobrada: "border-green-200 bg-green-50",
  rechazada: "border-slate-200 bg-slate-50",
};

function ObraCard({ obra }: { obra: ObraItem }) {
  const href = obra.quoteId
    ? `/cotizaciones/${obra.quoteId}`
    : obra.surveyId
      ? `/levantamientos/${obra.surveyId}`
      : `/clientes/${obra.clientId}`;

  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 transition hover:opacity-90 ${ETAPA_COLORS[obra.etapa]}`}
    >
      <p className="font-medium text-slate-900">{obra.titulo}</p>
      <p className="mt-1 text-sm text-slate-600">{obra.clientNombre}</p>
      {obra.quoteNumero && (
        <p className="mt-1 text-xs text-slate-500">{obra.quoteNumero}</p>
      )}
      {obra.quoteTotal != null && obra.quoteTotal > 0 && (
        <p className="mt-2 text-sm font-medium text-slate-800">
          {formatCurrency(obra.quoteTotal)}
          {obra.saldo > 0 && (
            <span className="ml-2 text-amber-700">· Pendiente {formatCurrency(obra.saldo)}</span>
          )}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-500">{formatDate(obra.fecha)}</p>
    </Link>
  );
}

export default function ObrasPage() {
  const router = useRouter();
  const { permissions, loading: sessionLoading } = useSession();
  const [data, setData] = useState<ObrasDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/obras");
    if (res.status === 403) {
      router.replace("/");
      return;
    }
    if (!res.ok) {
      setError("No se pudo cargar el tablero de obras");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!permissions?.canAccessFinanzas) {
      router.replace("/");
      return;
    }
    loadData();
  }, [sessionLoading, permissions, loadData, router]);

  const obrasPorEtapa = useMemo(() => {
    const grouped = Object.fromEntries(
      OBRA_ETAPA_ORDER.map((etapa) => [etapa, [] as ObraItem[]]),
    ) as Record<ObraEtapa, ObraItem[]>;

    for (const obra of data?.obras ?? []) {
      grouped[obra.etapa]?.push(obra);
    }
    return grouped;
  }, [data]);

  if (sessionLoading || !permissions?.canAccessFinanzas) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Control de obras"
          subtitle="Seguimiento de proyectos y cuentas por cobrar"
          action={
            <Button variant="secondary" size="sm" onClick={() => loadData()}>
              Actualizar
            </Button>
          }
        />

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {loading || !data ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Obras activas</p>
              <p className="text-2xl font-bold text-brand-navy">{data.summary.obrasActivas}</p>
            </div>
            <div className="rounded-lg border bg-amber-50 p-4">
              <p className="text-sm text-amber-800">Total por cobrar</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatCurrency(data.summary.totalPorCobrar)}
              </p>
            </div>
            <div className="rounded-lg border bg-teal-50 p-4">
              <p className="text-sm text-teal-800">En obra</p>
              <p className="text-2xl font-bold text-teal-900">
                {data.summary.porEtapa.en_obra}
              </p>
            </div>
          </div>
        )}
      </Card>

      {data && data.receivables.length > 0 && (
        <Card>
          <CardHeader
            title="Cuentas por cobrar"
            subtitle="Cotizaciones aceptadas o en obra con saldo pendiente"
            action={
              <Link href="/finanzas">
                <Button size="sm">Registrar cobro</Button>
              </Link>
            }
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Obra / cotización</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Cobrado</th>
                  <th className="px-3 py-2 font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Etapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {data.receivables.map((obra) => (
                  <tr key={obra.id}>
                    <td className="px-3 py-2">{obra.clientNombre}</td>
                    <td className="px-3 py-2">
                      {obra.quoteId ? (
                        <Link
                          href={`/cotizaciones/${obra.quoteId}`}
                          className="text-brand-navy underline"
                        >
                          {obra.titulo}
                        </Link>
                      ) : (
                        obra.titulo
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatCurrency(obra.quoteTotal ?? 0)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-green-700">
                      {formatCurrency(obra.cobrado)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-amber-700">
                      {formatCurrency(obra.saldo)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {OBRA_ETAPA_LABELS[obra.etapa]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data && (
        <div className="space-y-4">
          {OBRA_ETAPA_ORDER.map((etapa) => {
            const items = obrasPorEtapa[etapa];
            if (items.length === 0) return null;
            return (
              <Card key={etapa}>
                <CardHeader
                  title={OBRA_ETAPA_LABELS[etapa]}
                  subtitle={`${items.length} proyecto(s)`}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((obra) => (
                    <ObraCard key={obra.id} obra={obra} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
