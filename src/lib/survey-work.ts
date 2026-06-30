import type { PhotovoltaicData, Survey, SurveyArea, SurveyWorkItem, WorkDifficulty } from "./types";

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

export function resolveTipoTrabajo(
  item: Pick<SurveyWorkItem, "tipoTrabajo" | "tipoTrabajoPersonalizado">,
): string {
  if (item.tipoTrabajo === "Otro") {
    return item.tipoTrabajoPersonalizado?.trim() || "Otro";
  }
  return item.tipoTrabajo;
}

export function buildTiposTrabajoOptions(customTypes: string[]): string[] {
  const standard = TIPOS_TRABAJO.filter((tipo) => tipo !== "Otro");
  const custom = customTypes
    .map((nombre) => nombre.trim())
    .filter(
      (nombre) =>
        nombre.length > 0 &&
        nombre.toLowerCase() !== "otro" &&
        !isStandardTipoTrabajo(nombre),
    )
    .sort((a, b) => a.localeCompare(b, "es"));

  return [...standard, ...custom, "Otro"];
}

export function isStandardTipoTrabajo(value: string): value is TipoTrabajo {
  return (TIPOS_TRABAJO as readonly string[]).includes(value);
}

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

export function createEmptyWorkItem(areaNombre = ""): SurveyWorkItem {
  return {
    id: crypto.randomUUID(),
    tipoTrabajo: "Otro",
    area: areaNombre,
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

  if (tipoTrabajo === "Otro") {
    next.tipoTrabajoPersonalizado = item.tipoTrabajoPersonalizado ?? "";
  } else {
    next.tipoTrabajoPersonalizado = undefined;
  }

  if (!next.descripcionManual) {
    next.descripcion = generateWorkDescription(next);
  }

  return next;
}

export function applyWorkItemPatch(
  item: SurveyWorkItem,
  patch: Partial<SurveyWorkItem>,
  areaNombre = "",
): SurveyWorkItem {
  let next = { ...item, ...patch, area: areaNombre || item.area };

  if (patch.tipoTrabajo) {
    if (isStandardTipoTrabajo(patch.tipoTrabajo)) {
      next = applyTipoTrabajoDefaults(next, patch.tipoTrabajo);
    } else {
      next.tipoTrabajo = patch.tipoTrabajo;
      next.tipoTrabajoPersonalizado = undefined;
      next.fotovoltaico = undefined;
      if (!next.descripcionManual) {
        next.descripcion = generateWorkDescription(next);
      }
    }
    next.area = areaNombre || next.area;
    return next;
  }

  if (patch.tipoTrabajoPersonalizado !== undefined && next.tipoTrabajo === "Otro") {
    if (!next.descripcionManual) {
      next.descripcion = generateWorkDescription(next);
    }
  } else if (!next.descripcionManual) {
    next.descripcion = generateWorkDescription(next);
  }

  return next;
}

export async function registerCustomWorkTypesFromPartidas(
  partidas: SurveyWorkItem[],
  ensure: (nombre: string) => Promise<unknown>,
) {
  const seen = new Set<string>();
  for (const partida of partidas) {
    if (partida.tipoTrabajo !== "Otro") continue;
    const nombre = partida.tipoTrabajoPersonalizado?.trim();
    if (!nombre || seen.has(nombre.toLowerCase())) continue;
    seen.add(nombre.toLowerCase());
    await ensure(nombre);
  }
}

export function generateWorkDescription(item: SurveyWorkItem): string {
  const parts = [resolveTipoTrabajo(item)];
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

export function createEmptyArea(): SurveyArea {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    partidas: [],
  };
}

export function flattenAreasToPartidas(areas: SurveyArea[]): SurveyWorkItem[] {
  return areas.flatMap((area) =>
    area.partidas.map((partida) => ({
      ...partida,
      area: area.nombre,
    })),
  );
}

export function getSurveyAreas(survey: Pick<Survey, "areas" | "partidas">): SurveyArea[] {
  if (survey.areas?.length) return survey.areas;

  const partidas = survey.partidas ?? [];
  if (partidas.length === 0) return [];

  const grouped = new Map<string, SurveyWorkItem[]>();
  for (const partida of partidas) {
    const nombre = partida.area?.trim() || "General";
    const list = grouped.get(nombre) ?? [];
    list.push(partida);
    grouped.set(nombre, list);
  }

  return Array.from(grouped.entries()).map(([nombre, items]) => ({
    id: crypto.randomUUID(),
    nombre,
    partidas: items,
  }));
}
