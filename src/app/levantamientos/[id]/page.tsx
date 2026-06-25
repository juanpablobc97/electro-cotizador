"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import { formatDate } from "@/lib/utils";
import { GENERAL_PHOTO_CATEGORIES, DIFICULTAD_OPTIONS, getSurveyAreas } from "@/lib/survey-work";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SurveySummaryTable } from "@/components/survey/SurveySummaryTable";

function dificultadLabel(value: string) {
  return DIFICULTAD_OPTIONS.find((d) => d.value === value)?.label ?? value;
}

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

  const areas = getSurveyAreas(survey);
  const partidas = survey.partidas ?? [];
  const fotosGenerales = survey.fotosGenerales ?? {};
  const fotosLegacy = survey.fotos ?? [];

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
            <div className="flex flex-wrap gap-2">
              <Link href={`/cotizaciones/nuevo?surveyId=${id}&clientId=${survey.clientId}`}>
                <Button size="sm">Crear cotización</Button>
              </Link>
              <Button size="sm" variant="danger" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          }
        />

        <h3 className="mb-3 text-sm font-semibold text-slate-800">Datos del cliente y obra</h3>
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
        </dl>
      </Card>

      {areas.length > 0 && (
        <Card>
          <CardHeader
            title="Áreas y trabajos"
            subtitle={`${areas.length} área(s) · ${partidas.length} partida(s)`}
          />
          <SurveySummaryTable partidas={partidas} />
          <div className="mt-4 space-y-6">
            {areas.map((area) => (
              <div key={area.id} className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-navy">{area.nombre || "Sin nombre"}</h4>
                {area.partidas.map((p, i) => (
                  <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {i + 1}. {p.tipoTrabajo}
                    </p>
                    <p className="mt-1 text-slate-600">{p.descripcion}</p>
                    <p className="mt-1 text-slate-500">
                      {p.cantidad} {p.unidad} · Dificultad {dificultadLabel(p.dificultad)}
                    </p>
                    {p.observaciones && (
                      <p className="mt-2 text-slate-600">{p.observaciones}</p>
                    )}
                    {p.fotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {p.fotos.map((foto, fi) => (
                          <img
                            key={fi}
                            src={foto}
                            alt={`${area.nombre} partida ${i + 1} foto ${fi + 1}`}
                            className="aspect-square rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {p.tipoTrabajo === "Proyecto fotovoltaico" && p.fotovoltaico && (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        {p.fotovoltaico.tipoProyecto && (
                          <div>
                            <dt className="text-slate-500">Tipo de proyecto</dt>
                            <dd className="capitalize">{p.fotovoltaico.tipoProyecto}</dd>
                          </div>
                        )}
                        {p.fotovoltaico.capacidadEstimadaKw != null && (
                          <div>
                            <dt className="text-slate-500">Capacidad estimada</dt>
                            <dd>{p.fotovoltaico.capacidadEstimadaKw} kW</dd>
                          </div>
                        )}
                        {p.fotovoltaico.numeroPaneles != null && (
                          <div>
                            <dt className="text-slate-500">Paneles estimados</dt>
                            <dd>{p.fotovoltaico.numeroPaneles}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {GENERAL_PHOTO_CATEGORIES.some(({ key }) => (fotosGenerales[key]?.length ?? 0) > 0) && (
        <Card>
          <CardHeader title="Evidencia fotográfica general" />
          <div className="space-y-4">
            {GENERAL_PHOTO_CATEGORIES.map(({ key, label }) => {
              const fotos = fotosGenerales[key] ?? [];
              if (fotos.length === 0) return null;
              return (
                <div key={key}>
                  <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {fotos.map((foto, i) => (
                      <img
                        key={i}
                        src={foto}
                        alt={`${label} ${i + 1}`}
                        className="aspect-square rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {fotosLegacy.length > 0 && (
        <Card>
          <CardHeader title="Fotos del sitio (anteriores)" subtitle={`${fotosLegacy.length} imagen(es)`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotosLegacy.map((foto, i) => (
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
