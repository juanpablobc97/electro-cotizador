import type { Material, QuoteLaborItem, QuoteMaterialItem, Survey, SurveyWorkItem } from "./types";
import { resolveTipoTrabajo } from "./survey-work";

const DEFAULT_TARIFA_UNIDAD = 100;

const TARIFA_POR_TIPO: Record<string, number> = {
  "Instalación de contacto": 100,
  "Instalación de contacto especial": 150,
  "Instalación de apagador": 100,
  "Instalación de luminaria sencilla/básica": 120,
  "Instalación de luminaria de lujo": 250,
  "Instalación de minisplit": 800,
  "Instalación de cargador EV": 2500,
  "Centro de carga": 1200,
  "Instalación de tablero": 1500,
  "Cableado de circuito": 800,
  "Canalización en tubería galvanizada": 80,
  "Canalización PVC": 60,
  "Ranura en muro": 120,
  "Ranura en piso": 150,
  "Tierra física": 1200,
  "Cambio de interruptor": 100,
  "Registro eléctrico": 400,
  "Diagnóstico eléctrico": 500,
  "Proyecto fotovoltaico": 8000,
};

function defaultTarifaUnidad(partida: SurveyWorkItem): number {
  return TARIFA_POR_TIPO[resolveTipoTrabajo(partida)] ?? DEFAULT_TARIFA_UNIDAD;
}

function laborDescription(partida: SurveyWorkItem): string {
  const main = partida.descripcion?.trim() || resolveTipoTrabajo(partida);
  const area = partida.area ? ` — ${partida.area}` : "";
  return `${main}${area}`;
}

function partidaToLabor(partida: SurveyWorkItem): QuoteLaborItem {
  return {
    descripcion: laborDescription(partida),
    cantidad: partida.cantidad || 1,
    unidad: partida.unidad || "pza",
    tarifaUnidad: defaultTarifaUnidad(partida),
  };
}

export function buildLaborFromSurvey(survey: Survey): QuoteLaborItem[] {
  const partidas = survey.partidas ?? [];
  if (partidas.length > 0) {
    return partidas.map(partidaToLabor);
  }

  const items: QuoteLaborItem[] = [];

  if (survey.numCircuitos > 0) {
    items.push({
      descripcion: `Cableado de ${survey.numCircuitos} circuito(s)`,
      cantidad: survey.numCircuitos,
      unidad: "servicio",
      tarifaUnidad: TARIFA_POR_TIPO["Cableado de circuito"],
    });
  }
  if (survey.numContactos > 0) {
    items.push({
      descripcion: `Instalación de ${survey.numContactos} contacto(s)`,
      cantidad: survey.numContactos,
      unidad: "pza",
      tarifaUnidad: TARIFA_POR_TIPO["Instalación de contacto"],
    });
  }
  if (survey.numLuminarias > 0) {
    items.push({
      descripcion: `Instalación de ${survey.numLuminarias} luminaria(s)`,
      cantidad: survey.numLuminarias,
      unidad: "pza",
      tarifaUnidad: TARIFA_POR_TIPO["Instalación de luminaria sencilla/básica"],
    });
  }
  if (survey.requiereTablero) {
    items.push({
      descripcion: "Instalación de tablero de distribución",
      cantidad: 1,
      unidad: "servicio",
      tarifaUnidad: TARIFA_POR_TIPO["Instalación de tablero"],
    });
  }

  if (items.length === 0) {
    return [
      {
        descripcion: "Instalación eléctrica",
        cantidad: 1,
        unidad: "servicio",
        tarifaUnidad: DEFAULT_TARIFA_UNIDAD,
      },
    ];
  }

  return items;
}

function addCatalogMaterial(
  items: QuoteMaterialItem[],
  catalog: Material[],
  categoria: string,
  cantidad: number,
) {
  if (cantidad <= 0) return;
  const material = catalog.find((m) => m.categoria === categoria);
  items.push({
    materialId: material?.id,
    descripcion: material?.nombre ?? categoria,
    unidad: material?.unidad ?? "pza",
    cantidad,
    precioUnitario: material?.precioUnitario ?? 0,
  });
}

export function buildMaterialsFromSurvey(survey: Survey, catalog: Material[]): QuoteMaterialItem[] {
  const partidas = survey.partidas ?? [];
  if (partidas.length > 0) {
    return [];
  }

  const items: QuoteMaterialItem[] = [];
  addCatalogMaterial(items, catalog, "Cableado", survey.metrosCable);
  addCatalogMaterial(items, catalog, "Contactos", survey.numContactos);
  addCatalogMaterial(items, catalog, "Iluminación", survey.numLuminarias);
  if (survey.requiereTablero) addCatalogMaterial(items, catalog, "Tableros", 1);

  return items;
}

export function buildNotesFromSurvey(_survey: Survey): string {
  return "";
}
