import type { PhotovoltaicData, SurveyWorkItem, WorkDifficulty } from "./types";

export const TIPOS_TRABAJO = [
  "Instalación de cargador EV",
  "Proyecto fotovoltaico",
  "Canalización en tubería galvanizada",
  "Canalización PVC",
  "Centro de carga",
  "Instalación de contacto",
  "Instalación de contacto especial",
  "Ranura en muro",
  "Ranura en piso",
  "Instalación de luminaria sencilla/básica",
  "Instalación de luminaria de lujo",
  "Instalación de apagador",
  "Instalación de minisplit",
  "Cableado de circuito",
  "Instalación de tablero",
  "Tierra física",
  "Cambio de interruptor",
  "Registro eléctrico",
  "Diagnóstico eléctrico",
  "Otro",
] as const;

export type TipoTrabajo = (typeof TIPOS_TRABAJO)[number];

export const GENERAL_PHOTO_CATEGORIES = [
  { key: "fachada", label: "Fachada" },
  { key: "acometida", label: "Acometida" },
  { key: "medidor", label: "Medidor" },
  { key: "tablero", label: "Tablero" },
  { key: "interiorTablero", label: "Interior de tablero" },
  { key: "rutaGeneral", label: "Ruta general" },
  { key: "areaTrabajo", label: "Área de trabajo" },
] as const;

export type GeneralPhotoKey = (typeof GENERAL_PHOTO_CATEGORIES)[number]["key"];

const DEFAULTS: Partial<
  Record<TipoTrabajo, Partial<Pick<SurveyWorkItem, "unidad" | "requiereRanura" | "requiereCanalizacion">>>
> = {
  "Proyecto fotovoltaico": { unidad: "servicio", requiereCanalizacion: true },
  "Canalización en tubería galvanizada": { unidad: "m", requiereCanalizacion: true },
  "Canalización PVC": { unidad: "m", requiereCanalizacion: true },
  "Ranura en muro": { unidad: "m", requiereRanura: true },
  "Ranura en piso": { unidad: "m", requiereRanura: true },
  "Instalación de contacto": { unidad: "pza" },
  "Instalación de contacto especial": { unidad: "pza" },
  "Instalación de luminaria sencilla/básica": { unidad: "pza" },
  "Instalación de luminaria de lujo": { unidad: "pza" },
  "Instalación de cargador EV": { unidad: "servicio", requiereCanalizacion: true },
  "Centro de carga": { unidad: "pza" },
};

export function createEmptyPhotovoltaic(): PhotovoltaicData {
  return {
    tipoProyecto: "interconectado",
    sombras: false,
    requiereEstructura: false,
    requiereCanalizacion: true,
    requiereProteccionesDcAc: true,
    requiereSistemaTierras: true,
    requiereTramiteCfe: true,
    fotosReciboCfe: [],
    fotosTecho: [],
    fotosTablero: [],
    fotosAcometida: [],
    fotosRutaCanalizacion: [],
  };
}

export function createEmptyWorkItem(): SurveyWorkItem {
  return {
    id: crypto.randomUUID(),
    tipoTrabajo: "Otro",
    area: "",
    cantidad: 1,
    unidad: "pza",
    descripcion: "",
    descripcionManual: false,
    materialIncluido: false,
    dificultad: "media",
    alturaTrabajo: "",
    requiereRanura: false,
    requiereCanalizacion: false,
    fotos: [],
    observaciones: "",
  };
}

export function applyTipoTrabajoDefaults(
  item: SurveyWorkItem,
  tipoTrabajo: TipoTrabajo,
): SurveyWorkItem {
  const defaults = DEFAULTS[tipoTrabajo];
  const next: SurveyWorkItem = {
    ...item,
    tipoTrabajo,
    unidad: defaults?.unidad ?? item.unidad,
    requiereRanura: defaults?.requiereRanura ?? false,
    requiereCanalizacion: defaults?.requiereCanalizacion ?? false,
  };

  if (tipoTrabajo === "Proyecto fotovoltaico") {
    next.fotovoltaico = item.fotovoltaico ?? createEmptyPhotovoltaic();
    next.requiereCanalizacion = true;
    next.unidad = "servicio";
  } else {
    next.fotovoltaico = undefined;
  }

  if (!next.descripcionManual) {
    next.descripcion = generateWorkDescription(next);
  }

  return next;
}

export function generateWorkDescription(item: SurveyWorkItem): string {
  const parts = [item.tipoTrabajo];
  if (item.area) parts.push(`en ${item.area}`);
  if (item.cantidad && item.unidad) {
    parts.push(`— ${item.cantidad} ${item.unidad}`);
  }
  if (item.materialIncluido) parts.push("(material incluido)");
  if (item.requiereRanura) parts.push("con ranura");
  if (item.requiereCanalizacion) parts.push("con canalización");
  if (item.alturaTrabajo) parts.push(`altura: ${item.alturaTrabajo}`);
  if (item.tipoTrabajo === "Proyecto fotovoltaico" && item.fotovoltaico?.tipoProyecto) {
    parts.push(`(${item.fotovoltaico.tipoProyecto})`);
  }
  return parts.join(" ");
}

export const DIFICULTAD_OPTIONS: { value: WorkDifficulty; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export const UNIDAD_OPTIONS = [
  { value: "pza", label: "Pieza (pza)" },
  { value: "m", label: "Metro (m)" },
  { value: "servicio", label: "Servicio" },
  { value: "hr", label: "Hora (hr)" },
  { value: "rollo", label: "Rollo" },
];

export async function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  const results: string[] = [];
  for (const file of list) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    results.push(dataUrl);
  }
  return results;
}
