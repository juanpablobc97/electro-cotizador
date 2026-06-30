"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { SurveyWorkItem } from "@/lib/types";
import { db } from "@/lib/db";
import { dataStore } from "@/lib/sync";
import {
  applyWorkItemPatch,
  buildTiposTrabajoOptions,
  DIFICULTAD_OPTIONS,
  UNIDAD_OPTIONS,
} from "@/lib/survey-work";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PhotovoltaicFields } from "./PhotovoltaicFields";
import { PhotoField } from "./PhotoField";

export function WorkItemCard({
  item,
  index,
  areaNombre = "",
  onChange,
  onRemove,
}: {
  item: SurveyWorkItem;
  index: number;
  areaNombre?: string;
  onChange: (item: SurveyWorkItem) => void;
  onRemove: () => void;
}) {
  const customWorkTypes =
    useLiveQuery(() => db.customWorkTypes.orderBy("nombre").toArray()) ?? [];
  const tipoOptions = buildTiposTrabajoOptions(customWorkTypes.map((tipo) => tipo.nombre));

  function update(patch: Partial<SurveyWorkItem>) {
    onChange(applyWorkItemPatch(item, patch, areaNombre));
  }

  async function saveCustomWorkType(nombre: string) {
    const trimmed = nombre.trim();
    if (trimmed.length < 3) return;
    await dataStore.customWorkTypes.ensure(trimmed);
  }

  function updateFotovoltaico(fotovoltaico: NonNullable<SurveyWorkItem["fotovoltaico"]>) {
    onChange(applyWorkItemPatch(item, { fotovoltaico }, areaNombre));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Partida {index + 1}</h4>
        <Button type="button" size="sm" variant="danger" onClick={onRemove}>
          Quitar
        </Button>
      </div>

      <Select
        label="Tipo de trabajo *"
        value={item.tipoTrabajo}
        onChange={(e) => update({ tipoTrabajo: e.target.value })}
        options={tipoOptions.map((tipo) => ({
          value: tipo,
          label: tipo === "Otro" ? "Otro (especificar)" : tipo,
        }))}
      />

      {item.tipoTrabajo === "Otro" && (
        <Input
          label="Describe el trabajo *"
          value={item.tipoTrabajoPersonalizado ?? ""}
          onChange={(e) =>
            update({ tipoTrabajoPersonalizado: e.target.value, descripcionManual: false })
          }
          onBlur={(e) => void saveCustomWorkType(e.target.value)}
          placeholder="Ej. Instalación de bomba de agua, revisión de transformador..."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Cantidad *"
          type="number"
          min={0}
          step="any"
          value={item.cantidad}
          onChange={(e) => update({ cantidad: Number(e.target.value) || 0 })}
        />
        <Select
          label="Unidad"
          value={item.unidad}
          onChange={(e) => update({ unidad: e.target.value })}
          options={UNIDAD_OPTIONS}
        />
        <Select
          label="Dificultad"
          value={item.dificultad}
          onChange={(e) =>
            update({ dificultad: e.target.value as SurveyWorkItem["dificultad"] })
          }
          options={DIFICULTAD_OPTIONS}
        />
        <Input
          label="Altura de trabajo"
          value={item.alturaTrabajo}
          onChange={(e) => update({ alturaTrabajo: e.target.value })}
          placeholder="2.5 m, plafón, etc."
        />
      </div>

      <Textarea
        label="Descripción"
        value={item.descripcion}
        onChange={(e) => onChange({ ...item, descripcion: e.target.value, descripcionManual: true })}
        placeholder="Se genera automáticamente al cambiar los datos"
      />

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.materialIncluido}
            onChange={(e) => update({ materialIncluido: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          Material incluido
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.requiereRanura}
            onChange={(e) => update({ requiereRanura: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          Requiere ranura
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.requiereCanalizacion}
            onChange={(e) => update({ requiereCanalizacion: e.target.checked })}
            className="h-4 w-4 rounded"
          />
          Requiere canalización
        </label>
      </div>

      <Textarea
        label="Observaciones de la partida"
        value={item.observaciones ?? ""}
        onChange={(e) => update({ observaciones: e.target.value })}
      />

      <PhotoField
        label="Fotos de la partida"
        photos={item.fotos}
        onChange={(fotos) => update({ fotos })}
      />

      {item.tipoTrabajo === "Proyecto fotovoltaico" && item.fotovoltaico && (
        <PhotovoltaicFields data={item.fotovoltaico} onChange={updateFotovoltaico} />
      )}
    </div>
  );
}
