import type {
  Client,
  FinanceCategory,
  FinanceMovement,
  ObraEtapa,
  ObraItem,
  ObrasDashboard,
  ObrasSummary,
  Quote,
  ServiceSheet,
  Survey,
} from "./types";
import { calculateQuoteTotals } from "./utils";

export const OBRA_ETAPA_LABELS: Record<ObraEtapa, string> = {
  levantamiento: "Levantamiento",
  cotizada: "Cotizada",
  aceptada: "Aceptada",
  en_obra: "En obra",
  cobrada: "Cobrada",
  rechazada: "Rechazada",
};

export const OBRA_ETAPA_ORDER: ObraEtapa[] = [
  "levantamiento",
  "cotizada",
  "aceptada",
  "en_obra",
  "cobrada",
];

const COBRO_CATEGORIES: FinanceCategory[] = [
  "anticipo_obra",
  "cobro_parcial",
  "cobro_liquidacion",
];

type BuildObrasInput = {
  clients: Client[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
  movements: FinanceMovement[];
};

function cobradoPorQuote(movements: FinanceMovement[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const movement of movements) {
    if (movement.tipo !== "ingreso" || movement.quoteId == null) continue;
    if (!COBRO_CATEGORIES.includes(movement.categoria)) continue;
    map.set(movement.quoteId, (map.get(movement.quoteId) ?? 0) + movement.monto);
  }
  return map;
}

function serviceSheetByQuoteId(serviceSheets: ServiceSheet[]): Map<number, ServiceSheet> {
  const map = new Map<number, ServiceSheet>();
  for (const sheet of serviceSheets) {
    if (sheet.quoteId != null && !map.has(sheet.quoteId)) {
      map.set(sheet.quoteId, sheet);
    }
  }
  return map;
}

function quoteEtapa(
  quote: Quote,
  quoteTotal: number,
  cobrado: number,
  hasServiceSheet: boolean,
): ObraEtapa {
  if (quote.estado === "rechazada") return "rechazada";
  if (cobrado >= quoteTotal - 0.01 && quote.estado === "aceptada") return "cobrada";

  if (quote.estado === "aceptada") {
    if (hasServiceSheet) return "en_obra";
    return "aceptada";
  }

  return "cotizada";
}

function buildSummary(obras: ObraItem[]): ObrasSummary {
  const porEtapa = {
    levantamiento: 0,
    cotizada: 0,
    aceptada: 0,
    en_obra: 0,
    cobrada: 0,
    rechazada: 0,
  } satisfies Record<ObraEtapa, number>;

  let totalPorCobrar = 0;
  let obrasActivas = 0;

  for (const obra of obras) {
    porEtapa[obra.etapa] += 1;
    if (obra.etapa !== "rechazada" && obra.etapa !== "cobrada") {
      obrasActivas += 1;
    }
    if (obra.saldo > 0 && obra.quoteId != null && obra.etapa !== "rechazada") {
      totalPorCobrar += obra.saldo;
    }
  }

  return { totalPorCobrar, obrasActivas, porEtapa };
}

export function buildObrasDashboard(input: BuildObrasInput): ObrasDashboard {
  const clientMap = new Map(input.clients.map((client) => [client.id!, client.nombre]));
  const surveyMap = new Map(input.surveys.map((survey) => [survey.id!, survey]));
  const cobradoMap = cobradoPorQuote(input.movements);
  const sheetMap = serviceSheetByQuoteId(input.serviceSheets);
  const quotedSurveyIds = new Set(
    input.quotes.map((quote) => quote.surveyId).filter((id): id is number => id != null),
  );

  const obras: ObraItem[] = [];

  for (const quote of input.quotes) {
    if (quote.id == null) continue;
    const survey = quote.surveyId != null ? surveyMap.get(quote.surveyId) : undefined;
    const sheet = sheetMap.get(quote.id);
    const quoteTotal = calculateQuoteTotals(quote).total;
    const cobrado = cobradoMap.get(quote.id) ?? 0;
    const etapa = quoteEtapa(quote, quoteTotal, cobrado, Boolean(sheet));
    const saldo = Math.max(0, quoteTotal - cobrado);

    obras.push({
      id: `quote-${quote.id}`,
      etapa,
      clientId: quote.clientId,
      clientNombre: clientMap.get(quote.clientId) ?? "Cliente",
      titulo: survey?.titulo ?? `Cotización ${quote.numero}`,
      surveyId: quote.surveyId,
      quoteId: quote.id,
      serviceSheetId: sheet?.id,
      quoteNumero: quote.numero,
      quoteTotal,
      cobrado,
      saldo,
      fecha: new Date(quote.fecha).toISOString(),
      direccion: survey?.direccionObra,
    });
  }

  for (const survey of input.surveys) {
    if (survey.id == null || quotedSurveyIds.has(survey.id)) continue;

    obras.push({
      id: `survey-${survey.id}`,
      etapa: "levantamiento",
      clientId: survey.clientId,
      clientNombre: clientMap.get(survey.clientId) ?? "Cliente",
      titulo: survey.titulo,
      surveyId: survey.id,
      cobrado: 0,
      saldo: 0,
      fecha: new Date(survey.fecha).toISOString(),
      direccion: survey.direccionObra,
    });
  }

  obras.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const receivables = obras
    .filter(
      (obra) =>
        obra.saldo > 0 &&
        obra.quoteId != null &&
        obra.etapa !== "rechazada" &&
        obra.etapa !== "cotizada",
    )
    .sort((a, b) => b.saldo - a.saldo);

  return {
    obras: obras.filter((obra) => obra.etapa !== "rechazada"),
    receivables,
    summary: buildSummary(obras),
  };
}
