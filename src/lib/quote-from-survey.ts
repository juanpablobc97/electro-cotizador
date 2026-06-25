import type {
  Material,
  MaterialUnit,
  QuoteLaborItem,
  QuoteMaterialItem,
  Survey,
  SurveyWorkItem,
  WorkDifficulty,
} from "./types";

const DEFAULT_TARIFA = 350;

const HOURS_PER_UNIT: Record<WorkDifficulty, number> = {
  baja: 1.5,
  media: 3,
  alta: 6,
};

function estimateLaborHours(partida: SurveyWorkItem): number {
  const { cantidad, unidad, dificultad } = partida;
  const factor = HOURS_PER_UNIT[dificultad] ?? 2;

  if (unidad === "hr") return cantidad || factor;
  if (unidad === "servicio") return factor * 2;
  if (unidad === "m") return Math.max(0.5, Number(cantidad) * 0.25);
  if (unidad === "pza") return Math.max(0.5, Number(cantidad) * factor);
  if (unidad === "rollo") return Math.max(1, Number(cantidad));
  return Math.max(0.5, Number(cantidad) || factor);
}

function laborDescription(partida: SurveyWorkItem): string {
  const main = partida.descripcion?.trim() || partida.tipoTrabajo;
  const area = partida.area ? ` — ${partida.area}` : "";
  return `${main}${area}`;
}

export function buildLaborFromSurvey(survey: Survey): QuoteLaborItem[] {
  const partidas = survey.partidas ?? [];
  if (partidas.length > 0) {
    return partidas.map((partida) => ({
      descripcion: laborDescription(partida),
      horas: Math.round(estimateLaborHours(partida) * 10) / 10,
      tarifaHora: DEFAULT_TARIFA,
    }));
  }

  const items: QuoteLaborItem[] = [];

  if (survey.numCircuitos > 0) {
    items.push({
      descripcion: `Cableado de ${survey.numCircuitos} circuito(s)`,
      horas: survey.numCircuitos * 4,
      tarifaHora: DEFAULT_TARIFA,
    });
  }
  if (survey.numContactos > 0) {
    items.push({
      descripcion: `Instalación de ${survey.numContactos} contacto(s)`,
      horas: survey.numContactos * 1.5,
      tarifaHora: DEFAULT_TARIFA,
    });
  }
  if (survey.numLuminarias > 0) {
    items.push({
      descripcion: `Instalación de ${survey.numLuminarias} luminaria(s)`,
      horas: survey.numLuminarias * 2,
      tarifaHora: DEFAULT_TARIFA,
    });
  }
  if (survey.requiereTablero) {
    items.push({
      descripcion: "Instalación de tablero de distribución",
      horas: 8,
      tarifaHora: DEFAULT_TARIFA,
    });
  }

  if (items.length === 0) {
    return [{ descripcion: "Instalación eléctrica", horas: 8, tarifaHora: DEFAULT_TARIFA }];
  }

  return items;
}

function toMaterialUnit(unidad: string): MaterialUnit {
  if (unidad === "m" || unidad === "rollo" || unidad === "kg" || unidad === "caja") {
    return unidad;
  }
  return "pza";
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
  const items: QuoteMaterialItem[] = [];
  const partidas = survey.partidas ?? [];

  for (const partida of partidas) {
    if (partida.materialIncluido) continue;

    const tipo = partida.tipoTrabajo.toLowerCase();
    const needsMaterialLine =
      tipo.includes("canalización") ||
      tipo.includes("canalizacion") ||
      tipo.includes("cableado") ||
      tipo.includes("centro de carga") ||
      tipo.includes("tablero") ||
      tipo.includes("contacto") ||
      tipo.includes("luminaria");

    if (!needsMaterialLine) continue;

    const exists = items.some(
      (item) => item.descripcion === (partida.descripcion || partida.tipoTrabajo),
    );
    if (exists) continue;

    items.push({
      descripcion: partida.descripcion || partida.tipoTrabajo,
      unidad: toMaterialUnit(partida.unidad),
      cantidad: partida.cantidad || 1,
      precioUnitario: 0,
    });
  }

  if (partidas.length === 0) {
    addCatalogMaterial(items, catalog, "Cableado", survey.metrosCable);
    addCatalogMaterial(items, catalog, "Contactos", survey.numContactos);
    addCatalogMaterial(items, catalog, "Iluminación", survey.numLuminarias);
    if (survey.requiereTablero) addCatalogMaterial(items, catalog, "Tableros", 1);
  }

  return items;
}

export function buildNotesFromSurvey(survey: Survey): string {
  const lines: string[] = [
    `Obra: ${survey.direccionObra}`,
    `Instalación ${survey.tipoInstalacion} · ${survey.voltaje}`,
  ];

  if (survey.observacionesGenerales) lines.push("", survey.observacionesGenerales);
  else if (survey.notas) lines.push("", survey.notas);

  const partidas = survey.partidas ?? [];
  if (partidas.length > 0) {
    lines.push("", "Partidas del levantamiento:");
    partidas.forEach((partida, index) => {
      const obs = partida.observaciones ? ` — ${partida.observaciones}` : "";
      lines.push(
        `${index + 1}. ${partida.descripcion || partida.tipoTrabajo} (${partida.cantidad} ${partida.unidad}, ${partida.dificultad})${obs}`,
      );
    });
    return lines.join("\n").trim();
  }

  const tech: string[] = [];
  if (survey.numCircuitos) tech.push(`${survey.numCircuitos} circuitos`);
  if (survey.metrosCable) tech.push(`${survey.metrosCable} m cable`);
  if (tech.length) lines.push(tech.join(" · "));

  return lines.join("\n").trim();
}
