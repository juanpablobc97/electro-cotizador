"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { SharePdfButtons } from "@/components/SharePdfButtons";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { generateQuotePdfBlob } from "@/lib/pdf";
import { buildQuoteMessage, getQuoteEmailSubject } from "@/lib/share-pdf";
import { calculateQuoteTotals, formatCurrency, formatDate, laborImporte, normalizeLaborItem } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

export default function CotizacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const quote = useLiveQuery(() => db.quotes.get(id), [id]);
  const client = useLiveQuery(
    () => (quote?.clientId ? db.clients.get(quote.clientId) : undefined),
    [quote?.clientId],
  );
  const survey = useLiveQuery(
    () => (quote?.surveyId ? db.surveys.get(quote.surveyId) : undefined),
    [quote?.surveyId],
  );

  if (quote === undefined || client === undefined) {
    return <p className="text-slate-500">Cargando...</p>;
  }
  if (!quote || !client) return <p className="text-slate-500">Cotización no encontrada.</p>;

  const totals = calculateQuoteTotals(quote);

  async function handleStatusChange(estado: string) {
    await dataStore.quotes.update(id, {
      estado: estado as "borrador" | "enviada" | "aceptada" | "rechazada",
      updatedAt: new Date(),
    });
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await dataStore.quotes.delete(id);
    router.push("/cotizaciones");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={quote.numero}
          subtitle={`${client.nombre} · ${formatDate(quote.fecha)}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Link href={`/hojas-servicio/nuevo?clientId=${client.id}&quoteId=${quote.id}`}>
                <Button size="sm" variant="secondary">
                  Crear hoja de servicio
                </Button>
              </Link>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          }
        />

        <div className="mb-4 max-w-xs">
          <Select
            label="Estado"
            value={quote.estado}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: "borrador", label: "Borrador" },
              { value: "enviada", label: "Enviada" },
              { value: "aceptada", label: "Aceptada" },
              { value: "rechazada", label: "Rechazada" },
            ]}
          />
        </div>

        <div className="mb-4 rounded-xl bg-brand-navy p-4 text-center">
          <p className="text-sm text-brand-gold">Total</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totals.total)}</p>
          <p className="mt-1 text-xs text-white/70">
            Subtotal {formatCurrency(totals.subtotal)} + IVA {formatCurrency(totals.iva)}
          </p>
        </div>

        <SharePdfButtons
          getPdf={() => generateQuotePdfBlob(quote, client, survey)}
          title={`Cotización ${quote.numero}`}
          message={buildQuoteMessage(quote, client)}
          subject={getQuoteEmailSubject(quote)}
          clientPhone={client.telefono}
          clientEmail={client.email}
        />
      </Card>

      {quote.materiales.length > 0 && (
        <Card>
          <CardHeader title="Materiales" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Descripción</th>
                  <th className="pb-2 pr-4">Cant.</th>
                  <th className="pb-2 pr-4">P.U.</th>
                  <th className="pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {quote.materiales.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{item.descripcion}</td>
                    <td className="py-2 pr-4">
                      {item.cantidad} {item.unidad}
                    </td>
                    <td className="py-2 pr-4">{formatCurrency(item.precioUnitario)}</td>
                    <td className="py-2">
                      {formatCurrency(item.cantidad * item.precioUnitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {quote.manoObra.length > 0 && (
        <Card>
          <CardHeader title="Mano de obra" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Descripción</th>
                  <th className="pb-2 pr-4">Cant.</th>
                  <th className="pb-2 pr-4">Unidad</th>
                  <th className="pb-2 pr-4">Tarifa</th>
                  <th className="pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {quote.manoObra.map((item, i) => {
                  const labor = normalizeLaborItem(item);
                  return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{labor.descripcion}</td>
                    <td className="py-2 pr-4">{labor.cantidad}</td>
                    <td className="py-2 pr-4">{labor.unidad}</td>
                    <td className="py-2 pr-4">{formatCurrency(labor.tarifaUnidad)}</td>
                    <td className="py-2">{formatCurrency(laborImporte(item))}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {quote.notas && (
        <Card>
          <CardHeader title="Notas" />
          <p className="text-sm text-slate-600">{quote.notas}</p>
        </Card>
      )}
    </div>
  );
}
