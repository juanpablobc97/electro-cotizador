import type {
  CollaboratorPaymentType,
  FinanceCategory,
  FinanceMovementType,
  PaymentMethod,
} from "./types";

export const INGRESO_CATEGORIES: FinanceCategory[] = [
  "anticipo_obra",
  "cobro_liquidacion",
  "cobro_parcial",
  "otro_ingreso",
];

export const EGRESO_CATEGORIES: FinanceCategory[] = [
  "pago_colaborador",
  "gasto_obra",
  "gasto_operativo",
  "material",
  "otro_egreso",
];

export const CATEGORY_LABELS: Record<FinanceCategory, string> = {
  anticipo_obra: "Anticipo de obra",
  cobro_liquidacion: "Liquidación / cobro",
  cobro_parcial: "Cobro parcial",
  otro_ingreso: "Otro ingreso",
  pago_colaborador: "Pago a colaborador",
  gasto_obra: "Gasto de obra",
  gasto_operativo: "Gasto operativo",
  material: "Compra de material",
  otro_egreso: "Otro egreso",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export const COLLABORATOR_PAYMENT_LABELS: Record<CollaboratorPaymentType, string> = {
  por_obra: "Por obra",
  por_dia: "Por día",
  por_proyecto: "Por proyecto",
  nomina_fija: "Nómina fija",
};

export const TIPO_LABELS: Record<FinanceMovementType, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso",
};

export function categoriesForTipo(tipo: FinanceMovementType): FinanceCategory[] {
  return tipo === "ingreso" ? INGRESO_CATEGORIES : EGRESO_CATEGORIES;
}

export function defaultCategoryForTipo(tipo: FinanceMovementType): FinanceCategory {
  return tipo === "ingreso" ? "anticipo_obra" : "gasto_operativo";
}

export const OBRA_COBRO_CATEGORIES: FinanceCategory[] = [
  "anticipo_obra",
  "cobro_parcial",
  "cobro_liquidacion",
];

export const OBRA_EGRESO_CATEGORIES: FinanceCategory[] = [
  "material",
  "gasto_obra",
  "pago_colaborador",
];

export function isObraEgresoCategory(categoria: FinanceCategory): boolean {
  return OBRA_EGRESO_CATEGORIES.includes(categoria);
}

export function suggestsQuoteLink(
  tipo: FinanceMovementType,
  categoria: FinanceCategory,
): boolean {
  if (tipo === "ingreso") {
    return OBRA_COBRO_CATEGORIES.includes(categoria);
  }
  return isObraEgresoCategory(categoria);
}
