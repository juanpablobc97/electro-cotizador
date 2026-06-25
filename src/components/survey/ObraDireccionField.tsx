"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function ObraDireccionField({
  modo,
  direccion,
  direccionCliente,
  onModoChange,
  onDireccionChange,
}: {
  modo: "cliente" | "otra";
  direccion: string;
  direccionCliente: string;
  onModoChange: (modo: "cliente" | "otra") => void;
  onDireccionChange: (direccion: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Select
        label="Dirección de obra *"
        value={modo}
        onChange={(e) => onModoChange(e.target.value as "cliente" | "otra")}
        options={[
          { value: "cliente", label: "Usar dirección del cliente" },
          { value: "otra", label: "Otra dirección" },
        ]}
      />

      {modo === "cliente" ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {direccionCliente || "Selecciona un cliente para ver su dirección."}
        </div>
      ) : (
        <Input
          label="Dirección de la obra"
          value={direccion}
          onChange={(e) => onDireccionChange(e.target.value)}
          required
          placeholder="Calle, número, colonia, ciudad..."
        />
      )}

      <input type="hidden" name="direccionObra" value={direccion} required={modo === "otra"} />
    </div>
  );
}
