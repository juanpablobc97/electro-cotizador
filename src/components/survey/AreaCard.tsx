"use client";

import type { SurveyArea, SurveyWorkItem } from "@/lib/types";
import { createEmptyWorkItem, generateWorkDescription } from "@/lib/survey-work";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WorkItemCard } from "./WorkItemCard";

export function AreaCard({
  area,
  index,
  onChange,
  onRemove,
}: {
  area: SurveyArea;
  index: number;
  onChange: (area: SurveyArea) => void;
  onRemove: () => void;
}) {
  function updateNombre(nombre: string) {
    onChange({
      ...area,
      nombre,
      partidas: area.partidas.map((partida) => {
        const next = { ...partida, area: nombre };
        if (!next.descripcionManual) {
          next.descripcion = generateWorkDescription(next);
        }
        return next;
      }),
    });
  }

  function updatePartida(partidaIndex: number, partida: SurveyWorkItem) {
    onChange({
      ...area,
      partidas: area.partidas.map((p, i) =>
        i === partidaIndex ? { ...partida, area: area.nombre } : p,
      ),
    });
  }

  function removePartida(partidaIndex: number) {
    onChange({
      ...area,
      partidas: area.partidas.filter((_, i) => i !== partidaIndex),
    });
  }

  function addPartida() {
    onChange({
      ...area,
      partidas: [...area.partidas, createEmptyWorkItem(area.nombre)],
    });
  }

  return (
    <div className="rounded-xl border border-brand-gold/40 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Área {index + 1}</h4>
        <Button type="button" size="sm" variant="danger" onClick={onRemove}>
          Quitar área
        </Button>
      </div>

      <Input
        label="Área / ubicación *"
        value={area.nombre}
        onChange={(e) => updateNombre(e.target.value)}
        placeholder="Cocina, fachada, cochera, planta baja..."
        required
      />

      {area.partidas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin trabajos en esta área.</p>
      ) : (
        <div className="space-y-4 border-l-2 border-brand-gold/30 pl-4">
          {area.partidas.map((partida, partidaIndex) => (
            <WorkItemCard
              key={partida.id}
              item={partida}
              index={partidaIndex}
              areaNombre={area.nombre}
              onChange={(updated) => updatePartida(partidaIndex, updated)}
              onRemove={() => removePartida(partidaIndex)}
            />
          ))}
        </div>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={addPartida}>
        + Agregar trabajo en esta área
      </Button>
    </div>
  );
}
