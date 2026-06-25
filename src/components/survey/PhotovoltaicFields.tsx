"use client";

import type { PhotovoltaicData } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { PhotoField } from "./PhotoField";

export function PhotovoltaicFields({
  data,
  onChange,
}: {
  data: PhotovoltaicData;
  onChange: (data: PhotovoltaicData) => void;
}) {
  function update(patch: Partial<PhotovoltaicData>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm font-medium text-amber-900">Datos del proyecto fotovoltaico</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Tipo de proyecto"
          value={data.tipoProyecto ?? "interconectado"}
          onChange={(e) =>
            update({ tipoProyecto: e.target.value as PhotovoltaicData["tipoProyecto"] })
          }
          options={[
            { value: "interconectado", label: "Interconectado" },
            { value: "aislado", label: "Aislado" },
            { value: "hibrido", label: "Híbrido" },
          ]}
        />
        <Input
          label="Recibo CFE o consumo mensual"
          value={data.reciboCfe ?? ""}
          onChange={(e) => update({ reciboCfe: e.target.value })}
        />
        <Input
          label="Consumo kWh bimestral"
          type="number"
          min={0}
          value={data.consumoKwhBimestral ?? ""}
          onChange={(e) => update({ consumoKwhBimestral: Number(e.target.value) || undefined })}
        />
        <Input
          label="Tarifa CFE"
          value={data.tarifaCfe ?? ""}
          onChange={(e) => update({ tarifaCfe: e.target.value })}
        />
        <Input
          label="Demanda objetivo"
          value={data.demandaObjetivo ?? ""}
          onChange={(e) => update({ demandaObjetivo: e.target.value })}
        />
        <Input
          label="Capacidad estimada del sistema (kW)"
          type="number"
          min={0}
          step="0.1"
          value={data.capacidadEstimadaKw ?? ""}
          onChange={(e) => update({ capacidadEstimadaKw: Number(e.target.value) || undefined })}
        />
        <Input
          label="Número estimado de paneles"
          type="number"
          min={0}
          value={data.numeroPaneles ?? ""}
          onChange={(e) => update({ numeroPaneles: Number(e.target.value) || undefined })}
        />
        <Input
          label="Potencia de panel (W)"
          type="number"
          min={0}
          value={data.potenciaPanel ?? ""}
          onChange={(e) => update({ potenciaPanel: Number(e.target.value) || undefined })}
        />
        <Select
          label="Tipo de inversor"
          value={data.tipoInversor ?? ""}
          onChange={(e) =>
            update({ tipoInversor: e.target.value as PhotovoltaicData["tipoInversor"] })
          }
          options={[
            { value: "", label: "Seleccionar..." },
            { value: "central", label: "Central" },
            { value: "microinversores", label: "Microinversores" },
            { value: "hibrido", label: "Híbrido" },
          ]}
        />
        <Input
          label="Voltaje de interconexión"
          value={data.voltajeInterconexion ?? ""}
          onChange={(e) => update({ voltajeInterconexion: e.target.value })}
        />
        <Select
          label="Tipo de techo"
          value={data.tipoTecho ?? ""}
          onChange={(e) =>
            update({ tipoTecho: e.target.value as PhotovoltaicData["tipoTecho"] })
          }
          options={[
            { value: "", label: "Seleccionar..." },
            { value: "losa", label: "Losa" },
            { value: "lamina", label: "Lámina" },
            { value: "teja", label: "Teja" },
            { value: "estructura_metalica", label: "Estructura metálica" },
          ]}
        />
        <Input
          label="Área disponible para paneles"
          value={data.areaDisponible ?? ""}
          onChange={(e) => update({ areaDisponible: e.target.value })}
        />
        <Input
          label="Orientación del techo"
          value={data.orientacionTecho ?? ""}
          onChange={(e) => update({ orientacionTecho: e.target.value })}
        />
        <Input
          label="Inclinación aproximada"
          value={data.inclinacionAproximada ?? ""}
          onChange={(e) => update({ inclinacionAproximada: e.target.value })}
        />
        <Select
          label="Sombras"
          value={data.sombras ? "si" : "no"}
          onChange={(e) => update({ sombras: e.target.value === "si" })}
          options={[
            { value: "no", label: "No" },
            { value: "si", label: "Sí" },
          ]}
        />
        <Input
          label="Distancia de paneles a inversor"
          value={data.distanciaPanelesInversor ?? ""}
          onChange={(e) => update({ distanciaPanelesInversor: e.target.value })}
        />
        <Input
          label="Distancia de inversor a tablero"
          value={data.distanciaInversorTablero ?? ""}
          onChange={(e) => update({ distanciaInversorTablero: e.target.value })}
        />
      </div>

      <Textarea
        label="Obstáculos en techo"
        value={data.obstaculosTecho ?? ""}
        onChange={(e) => update({ obstaculosTecho: e.target.value })}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["requiereEstructura", "Requiere estructura"],
            ["requiereCanalizacion", "Requiere canalización"],
            ["requiereProteccionesDcAc", "Requiere protecciones DC/AC"],
            ["requiereSistemaTierras", "Requiere sistema de tierras"],
            ["requiereTramiteCfe", "Requiere trámite CFE"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(data[key])}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoField
          label="Fotos del recibo CFE"
          photos={data.fotosReciboCfe ?? []}
          onChange={(fotosReciboCfe) => update({ fotosReciboCfe })}
        />
        <PhotoField
          label="Fotos del techo"
          photos={data.fotosTecho ?? []}
          onChange={(fotosTecho) => update({ fotosTecho })}
        />
        <PhotoField
          label="Fotos de tablero"
          photos={data.fotosTablero ?? []}
          onChange={(fotosTablero) => update({ fotosTablero })}
        />
        <PhotoField
          label="Fotos de acometida"
          photos={data.fotosAcometida ?? []}
          onChange={(fotosAcometida) => update({ fotosAcometida })}
        />
        <PhotoField
          label="Fotos de ruta de canalización"
          photos={data.fotosRutaCanalizacion ?? []}
          onChange={(fotosRutaCanalizacion) => update({ fotosRutaCanalizacion })}
        />
      </div>
    </div>
  );
}
