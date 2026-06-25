import { db } from "./db";
import type { Quote, ServiceMaterialItem, ServiceType, Survey } from "./types";

function mapTipoServicio(survey?: Survey): ServiceType {
  if (!survey) return "instalacion";
  if (survey.tipoInstalacion === "remodelacion") return "reparacion";
  return "instalacion";
}

export type ServiceAutofillData = {
  clientId: number;
  quoteId: number;
  direccionServicio: string;
  descripcionTrabajo: string;
  materiales: ServiceMaterialItem[];
  tipoServicio: ServiceType;
};

export async function buildServiceDataFromQuote(
  quoteId: number,
): Promise<ServiceAutofillData | null> {
  const quote = await db.quotes.get(quoteId);
  if (!quote?.id) return null;

  const client = await db.clients.get(quote.clientId);
  const survey = quote.surveyId ? await db.surveys.get(quote.surveyId) : undefined;

  return {
    clientId: quote.clientId,
    quoteId: quote.id,
    direccionServicio: survey?.direccionObra ?? client?.direccion ?? "",
    descripcionTrabajo: buildDescripcionFromQuote(quote),
    materiales: quote.materiales.map((m) => ({
      materialId: m.materialId,
      descripcion: m.descripcion,
      unidad: m.unidad,
      cantidad: m.cantidad,
    })),
    tipoServicio: mapTipoServicio(survey),
  };
}

function buildDescripcionFromQuote(quote: Quote): string {
  const lineas: string[] = [`Servicio realizado según cotización ${quote.numero}.`];

  if (quote.manoObra.length > 0) {
    lineas.push("", "Trabajos ejecutados:");
    quote.manoObra.forEach((item) => {
      lineas.push(`• ${item.descripcion} (${item.horas} hrs)`);
    });
  }

  return lineas.join("\n");
}

export async function buildServiceDataFromClient(
  clientId: number,
): Promise<Partial<ServiceAutofillData>> {
  const client = await db.clients.get(clientId);
  if (!client) return {};
  return { clientId, direccionServicio: client.direccion };
}
