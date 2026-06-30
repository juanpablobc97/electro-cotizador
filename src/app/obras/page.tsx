"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OBRA_ETAPA_LABELS, OBRA_ETAPA_ORDER } from "@/lib/obras";
import type { ObraEtapa, ObraItem, ObraProfitability, ObrasDashboard } from "@/lib/types";
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

function formatMargen(margenPct: number | null): string {
  if (margenPct == null) return "—";
  return `${margenPct.toFixed(0)}%`;
}

function ProfitabilityRow({
  obra,
  expanded,
  onToggle,
}: {
  obra: ObraProfitability;
  expanded: boolean;
  onToggle: () => void;
}) {
  const utilidadColor =
    obra.utilidad > 0 ? "text-emerald-700" : obra.utilidad < 0 ? "text-red-700" : "text-slate-600";

  return (
    <>
      <tr className="cursor-pointer hover:bg-slate-50" onClick={onToggle}>
        <td className="px-3 py-2">{obra.clientNombre}</td>
        <td className="px-3 py-2">
          {obra.quoteId ? (
            <Link
              href={`/cotizaciones/${obra.quoteId}`}
              className="text-brand-navy underline"
              onClick={(e) => e.stopPropagation()}
            >
              {obra.titulo}
            </Link>
          ) : (
            obra.titulo
          )}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">{OBRA_ETAPA_LABELS[obra.etapa]}</td>
        <td className="px-3 py-2 whitespace-nowrap">{formatCurrency(obra.presupuestado)}</td>
        <td className="px-3 py-2 whitespace-nowrap text-green-700">
          {formatCurrency(obra.cobrado)}
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-red-700">
          {formatCurrency(obra.gastado)}
        </td>
        <td className={`px-3 py-2 whitespace-nowrap font-medium ${utilidadColor}`}>
          {formatCurrency(obra.utilidad)}
        </td>
        <td className={`px-3 py-2 whitespace-nowrap ${utilidadColor}`}>
          {formatMargen(obra.margenPct)}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-3 py-3 text-sm text-slate-600">
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <span className="text-slate-500">Material: </span>
                {formatCurrency(obra.breakdown.egresosMaterial)}
              </div>
              <div>
                <span className="text-slate-500">Gasto obra: </span>
                {formatCurrency(obra.breakdown.egresosGastoObra)}
              </div>
              <div>
                <span className="text-slate-500">Colaboradores: </span>
                {formatCurrency(obra.breakdown.egresosColaborador)}
              </div>
              <div>
                <span className="text-slate-500">Otros egresos: </span>
                {formatCurrency(obra.breakdown.egresosOtros)}
              </div>
            </div>
            {obra.saldo > 0 && (
              <p className="mt-2 text-amber-700">
                Pendiente por cobrar: {formatCurrency(obra.saldo)}
              </p>
            )}
            <Link
              href="/finanzas"
              className="mt-2 inline-block text-brand-navy underline"
              onClick={(e) => e.stopPropagation()}
            >
              Ver movimientos en Finanzas
            </Link>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ObrasPage() {
  const router = useRouter();
  const { permissions, loading: sessionLoading } = useSession();
  const [data, setData] = useState<ObrasDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [soloConGastos, setSoloConGastos] = useState(false);

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

  const profitabilityRows = useMemo(() => {
    const rows = data?.report.obras ?? [];
    if (!soloConGastos) return rows;
    return rows.filter((obra) => obra.gastado > 0 || obra.cobrado > 0);
  }, [data, soloConGastos]);

  if (sessionLoading || !permissions?.canAccessFinanzas) {
    return <p className="text-slate-500">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Control de obras"
          subtitle="Seguimiento de proyectos, cuentas por cobrar y utilidad"
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

      {data && data.report.obras.length > 0 && (
        <Card>
          <CardHeader
            title="Utilidad por obra"
            subtitle="Cobrado menos gastos registrados en Finanzas (material, obra, colaboradores)"
            action={
              <Button
                size="sm"
                variant={soloConGastos ? "primary" : "secondary"}
                onClick={() => setSoloConGastos((value) => !value)}
              >
                {soloConGastos ? "Todas las obras" : "Con movimientos"}
              </Button>
            }
          />

          {data.report.summary.egresosSinObra > 0 && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Hay {data.report.summary.egresosSinObra} egreso(s) de obra sin cotización vinculada (
              {formatCurrency(data.report.summary.montoEgresosSinObra)}). En Finanzas, asigna la
              cotización para que entren en este reporte.
            </p>
          )}

          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total cobrado</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(data.report.summary.totalCobrado)}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total gastado</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(data.report.summary.totalGastado)}
              </p>
            </div>
            <div className="rounded-lg border bg-brand-gold-light p-4">
              <p className="text-sm text-brand-navy">Utilidad global</p>
              <p className="text-xl font-bold text-brand-navy">
                {formatCurrency(data.report.summary.utilidadGlobal)}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Presupuestado</p>
              <p className="text-xl font-bold text-slate-800">
                {formatCurrency(data.report.summary.totalPresupuestado)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Obra</th>
                  <th className="px-3 py-2 font-medium">Etapa</th>
                  <th className="px-3 py-2 font-medium">Presupuesto</th>
                  <th className="px-3 py-2 font-medium">Cobrado</th>
                  <th className="px-3 py-2 font-medium">Gastado</th>
                  <th className="px-3 py-2 font-medium">Utilidad</th>
                  <th className="px-3 py-2 font-medium">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {profitabilityRows.map((obra) => (
                  <ProfitabilityRow
                    key={obra.id}
                    obra={obra}
                    expanded={expandedId === obra.id}
                    onToggle={() =>
                      setExpandedId((current) => (current === obra.id ? null : obra.id))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Utilidad = cobrado − gastos vinculados a la cotización. El presupuesto es el total
            cotizado; puede diferir del efectivo cobrado.
          </p>
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
