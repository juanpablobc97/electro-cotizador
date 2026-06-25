import type { Quote, QuoteLaborItem, QuoteTotals } from "./types";

type LegacyLaborItem = QuoteLaborItem & { horas?: number; tarifaHora?: number };

export function normalizeLaborItem(item: LegacyLaborItem): QuoteLaborItem {
  if (item.cantidad != null && item.tarifaUnidad != null) {
    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidad ?? "pza",
      tarifaUnidad: item.tarifaUnidad,
    };
  }

  return {
    descripcion: item.descripcion,
    cantidad: item.horas ?? 0,
    unidad: "hr",
    tarifaUnidad: item.tarifaHora ?? 0,
  };
}

export function laborImporte(item: LegacyLaborItem): number {
  const normalized = normalizeLaborItem(item);
  return normalized.cantidad * normalized.tarifaUnidad;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function calculateQuoteTotals(quote: Quote): QuoteTotals {
  const subtotalMateriales = quote.materiales.reduce(
    (sum, item) => sum + item.cantidad * item.precioUnitario,
    0,
  );
  const subtotalManoObra = quote.manoObra.reduce((sum, item) => sum + laborImporte(item), 0);
  const subtotal = subtotalMateriales + subtotalManoObra;
  const iva = subtotal * (quote.ivaPorcentaje / 100);
  const total = subtotal + iva;

  return { subtotalMateriales, subtotalManoObra, subtotal, iva, total };
}

export function generateQuoteNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 900) + 100);
  return `COT-${year}${month}-${random}`;
}

export function generateServiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 900) + 100);
  return `SER-${year}${month}-${random}`;
}

export const SERVICE_TYPE_LABELS: Record<
  import("./types").ServiceType,
  string
> = {
  instalacion: "Instalación",
  reparacion: "Reparación",
  mantenimiento: "Mantenimiento",
  revision: "Revisión",
  otro: "Otro",
};

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
