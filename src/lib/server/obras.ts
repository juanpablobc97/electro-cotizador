import type { ObrasDashboard } from "@/lib/types";
import { buildObrasDashboard } from "@/lib/obras";
import { ensureFinanzasTable } from "./finanzas";
import { getDb, getFullSyncPayload } from "./sqlite";

function rowToFinanceMovement(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    tipo: row.tipo as "ingreso" | "egreso",
    categoria: row.categoria as import("@/lib/types").FinanceCategory,
    monto: Number(row.monto),
    fecha: new Date(row.fecha as string),
    concepto: row.concepto as string,
    formaPago: row.formaPago as import("@/lib/types").PaymentMethod,
    clientId: row.clientId != null ? Number(row.clientId) : undefined,
    quoteId: row.quoteId != null ? Number(row.quoteId) : undefined,
    serviceSheetId: row.serviceSheetId != null ? Number(row.serviceSheetId) : undefined,
    colaboradorId: row.colaboradorId != null ? Number(row.colaboradorId) : undefined,
    colaboradorPaymentType:
      (row.colaboradorPaymentType as import("@/lib/types").CollaboratorPaymentType) || undefined,
    notas: (row.notas as string) || undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

export function getObrasDashboard(): ObrasDashboard {
  ensureFinanzasTable();
  const db = getDb();
  const payload = getFullSyncPayload();
  const movements = (db
    .prepare("SELECT * FROM finance_movements WHERE quoteId IS NOT NULL")
    .all() as Record<string, unknown>[])
    .map(rowToFinanceMovement);

  return buildObrasDashboard({
    clients: payload.clients,
    surveys: payload.surveys,
    quotes: payload.quotes,
    serviceSheets: payload.serviceSheets,
    movements,
  });
}
