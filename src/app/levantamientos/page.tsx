"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";

export default function LevantamientosPage() {
  const surveys = useLiveQuery(() => db.surveys.orderBy("fecha").reverse().toArray()) ?? [];
  const clients = useLiveQuery(() => db.clients.toArray()) ?? [];
  const clientMap = new Map(clients.map((c) => [c.id!, c.nombre]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Levantamientos"
          subtitle="Registros de visita en sitio para instalaciones eléctricas"
          action={
            <Link href="/levantamientos/nuevo">
              <Button>+ Nuevo</Button>
            </Link>
          }
        />

        {surveys.length === 0 ? (
          <EmptyState
            title="Sin levantamientos"
            description="Documenta mediciones, circuitos, fotos y observaciones de cada visita a obra."
            action={
              <Link href="/levantamientos/nuevo">
                <Button>Crear levantamiento</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {surveys.map((survey) => (
              <Link
                key={survey.id}
                href={`/levantamientos/${survey.id}`}
                className="block rounded-lg border border-slate-200 p-4 hover:border-brand-gold"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{survey.titulo}</p>
                    <p className="text-sm text-slate-500">
                      {clientMap.get(survey.clientId) ?? "Cliente"} · {survey.direccionObra}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {(survey.partidas?.length ?? 0)} partida
                      {(survey.partidas?.length ?? 0) !== 1 ? "s" : ""}
                      {survey.estado === "completado" ? " · completado" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        survey.estado === "completado"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {survey.estado}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(survey.fecha)}</p>
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
