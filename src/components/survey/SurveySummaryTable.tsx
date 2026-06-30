import type { SurveyWorkItem } from "@/lib/types";
import { DIFICULTAD_OPTIONS, resolveTipoTrabajo } from "@/lib/survey-work";

function dificultadLabel(value: SurveyWorkItem["dificultad"]) {
  return DIFICULTAD_OPTIONS.find((d) => d.value === value)?.label ?? value;
}

export function SurveySummaryTable({ partidas }: { partidas: SurveyWorkItem[] }) {
  if (partidas.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Agrega al menos un trabajo para ver el resumen de cotización.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-3 py-2 font-medium">Área</th>
            <th className="px-3 py-2 font-medium">Partida</th>
            <th className="px-3 py-2 font-medium">Descripción</th>
            <th className="px-3 py-2 font-medium">Unidad</th>
            <th className="px-3 py-2 font-medium">Cantidad</th>
            <th className="px-3 py-2 font-medium">Dificultad</th>
            <th className="px-3 py-2 font-medium">Observaciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {partidas.map((p, i) => (
            <tr key={p.id}>
              <td className="px-3 py-2 whitespace-nowrap">{p.area || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{i + 1}</td>
              <td className="px-3 py-2 min-w-[12rem]">{p.descripcion || resolveTipoTrabajo(p)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{p.unidad}</td>
              <td className="px-3 py-2 whitespace-nowrap">{p.cantidad}</td>
              <td className="px-3 py-2 whitespace-nowrap">{dificultadLabel(p.dificultad)}</td>
              <td className="px-3 py-2 min-w-[8rem] text-slate-600">{p.observaciones || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
