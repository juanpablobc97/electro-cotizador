"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export default function LevantamientoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const survey = useLiveQuery(() => db.surveys.get(id), [id]);
  const client = useLiveQuery(
    () => (survey?.clientId ? db.clients.get(survey.clientId) : undefined),
    [survey?.clientId],
  );

  if (survey === undefined) return <p className="text-slate-500">Cargando...</p>;
  if (!survey) return <p className="text-slate-500">Levantamiento no encontrado.</p>;

  async function handleDelete() {
    if (!confirm("¿Eliminar este levantamiento?")) return;
    await dataStore.surveys.delete(id);
    router.push("/levantamientos");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={survey.titulo}
          subtitle={`${client?.nombre ?? "Cliente"} · ${formatDate(survey.fecha)}`}
          action={
            <div className="flex gap-2">
              <Link href={`/cotizaciones/nuevo?surveyId=${id}&clientId=${survey.clientId}`}>
                <Button size="sm">Crear cotización</Button>
              </Link>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          }
        />

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Dirección de obra</dt>
            <dd className="font-medium">{survey.direccionObra}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Estado</dt>
            <dd className="font-medium capitalize">{survey.estado}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tipo de instalación</dt>
            <dd className="font-medium capitalize">{survey.tipoInstalacion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Voltaje</dt>
            <dd className="font-medium">{survey.voltaje}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Circuitos</dt>
            <dd className="font-medium">{survey.numCircuitos}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Metros de cable</dt>
            <dd className="font-medium">{survey.metrosCable} m</dd>
          </div>
          <div>
            <dt className="text-slate-500">Contactos</dt>
            <dd className="font-medium">{survey.numContactos}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Luminarias</dt>
            <dd className="font-medium">{survey.numLuminarias}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tablero</dt>
            <dd className="font-medium">{survey.requiereTablero ? "Sí" : "No"}</dd>
          </div>
        </dl>

        {survey.notas && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Notas</p>
            <p className="mt-1 text-slate-600">{survey.notas}</p>
          </div>
        )}
      </Card>

      {survey.fotos.length > 0 && (
        <Card>
          <CardHeader title="Fotos del sitio" subtitle={`${survey.fotos.length} imagen(es)`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {survey.fotos.map((foto, i) => (
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
    </div>
  );
}
