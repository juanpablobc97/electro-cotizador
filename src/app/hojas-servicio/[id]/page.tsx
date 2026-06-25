"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { SharePdfButtons } from "@/components/SharePdfButtons";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { generateServiceSheetPdfBlob } from "@/lib/pdf";
import {
  buildServiceSheetMessage,
  getServiceSheetEmailSubject,
} from "@/lib/share-pdf";
import { SERVICE_TYPE_LABELS, formatDate } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export default function HojaServicioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { permissions } = useSession();

  const sheet = useLiveQuery(() => db.serviceSheets.get(id), [id]);
  const client = useLiveQuery(
    () => (sheet?.clientId ? db.clients.get(sheet.clientId) : undefined),
    [sheet?.clientId],
  );
  const quote = useLiveQuery(
    () => (sheet?.quoteId ? db.quotes.get(sheet.quoteId) : undefined),
    [sheet?.quoteId],
  );

  if (sheet === undefined || client === undefined) {
    return <p className="text-slate-500">Cargando...</p>;
  }
  if (!sheet || !client) {
    return <p className="text-slate-500">Hoja de servicio no encontrada.</p>;
  }

  const garantiaHasta = new Date(sheet.fecha);
  garantiaHasta.setMonth(garantiaHasta.getMonth() + sheet.garantiaMeses);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta hoja de servicio?")) return;
    await dataStore.serviceSheets.delete(id);
    router.push("/hojas-servicio");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={sheet.numero}
          subtitle={`${client.nombre} · ${formatDate(sheet.fecha)}`}
          action={
            permissions?.canDelete ? (
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            ) : undefined
          }
        />

        <div className="mb-4 rounded-xl bg-brand-navy p-4 text-center text-white">
          <p className="text-sm text-brand-gold">{SERVICE_TYPE_LABELS[sheet.tipoServicio]}</p>
          <p className="mt-1 text-lg font-bold">Garantía: {sheet.garantiaMeses} meses</p>
          <p className="mt-1 text-xs text-white/70">Vigente hasta {formatDate(garantiaHasta)}</p>
        </div>

        {quote && (
          <p className="mb-4 text-sm text-slate-500">
            Basada en cotización{" "}
            <Link href={`/cotizaciones/${quote.id}`} className="font-medium text-brand-navy underline">
              {quote.numero}
            </Link>
          </p>
        )}

        <SharePdfButtons
          getPdf={() => generateServiceSheetPdfBlob(sheet, client)}
          title={`Hoja de servicio ${sheet.numero}`}
          message={buildServiceSheetMessage(sheet, client)}
          subject={getServiceSheetEmailSubject(sheet)}
          clientPhone={client.telefono}
          clientEmail={client.email}
        />
      </Card>

      <Card>
        <CardHeader title="Detalle del servicio" />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Trabajo realizado</dt>
            <dd className="mt-1 whitespace-pre-line font-medium">{sheet.descripcionTrabajo}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Ubicación</dt>
            <dd className="font-medium">{sheet.direccionServicio}</dd>
          </div>
          {sheet.tecnico && (
            <div>
              <dt className="text-slate-500">Técnico</dt>
              <dd className="font-medium">{sheet.tecnico}</dd>
            </div>
          )}
        </dl>
      </Card>

      {sheet.materiales.length > 0 && (
        <Card>
          <CardHeader title="Materiales utilizados" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">Descripción</th>
                  <th className="pb-2">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {sheet.materiales.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{item.descripcion}</td>
                    <td className="py-2">
                      {item.cantidad} {item.unidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {sheet.fotos.length > 0 && (
        <Card>
          <CardHeader title="Fotos del trabajo" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sheet.fotos.map((foto, i) => (
              <img
                key={i}
                src={foto}
                alt={`Foto ${i + 1}`}
                className="aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </Card>
      )}

      {sheet.notas && (
        <Card>
          <CardHeader title="Notas" />
          <p className="text-sm text-slate-600">{sheet.notas}</p>
        </Card>
      )}
    </div>
  );
}
