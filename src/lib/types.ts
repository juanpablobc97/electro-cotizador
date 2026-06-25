export type Client = {
  id?: number;
  nombre: string;
  empresa?: string;
  telefono: string;
  email?: string;
  direccion: string;
  notas?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MaterialUnit = "pza" | "m" | "rollo" | "kg" | "caja" | "hr";

export type Material = {
  id?: number;
  codigo: string;
  nombre: string;
  unidad: MaterialUnit;
  precioUnitario: number;
  categoria: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SurveyStatus = "borrador" | "completado";

export type Survey = {
  id?: number;
  clientId: number;
  titulo: string;
  fecha: Date;
  direccionObra: string;
  estado: SurveyStatus;
  tipoInstalacion: string;
  voltaje: string;
  numCircuitos: number;
  metrosCable: number;
  numContactos: number;
  numLuminarias: number;
  requiereTablero: boolean;
  notas?: string;
  fotos: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada";

export type QuoteMaterialItem = {
  materialId?: number;
  descripcion: string;
  unidad: MaterialUnit;
  cantidad: number;
  precioUnitario: number;
};

export type QuoteLaborItem = {
  descripcion: string;
  horas: number;
  tarifaHora: number;
};

export type Quote = {
  id?: number;
  clientId: number;
  surveyId?: number;
  numero: string;
  fecha: Date;
  validezDias: number;
  materiales: QuoteMaterialItem[];
  manoObra: QuoteLaborItem[];
  notas?: string;
  ivaPorcentaje: number;
  estado: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteTotals = {
  subtotalMateriales: number;
  subtotalManoObra: number;
  subtotal: number;
  iva: number;
  total: number;
};

export type ServiceType =
  | "instalacion"
  | "reparacion"
  | "mantenimiento"
  | "revision"
  | "otro";

export type ServiceMaterialItem = {
  materialId?: number;
  descripcion: string;
  unidad: MaterialUnit;
  cantidad: number;
};

export type ServiceSheet = {
  id?: number;
  clientId: number;
  quoteId?: number;
  numero: string;
  fecha: Date;
  tipoServicio: ServiceType;
  direccionServicio: string;
  descripcionTrabajo: string;
  materiales: ServiceMaterialItem[];
  garantiaMeses: number;
  notas?: string;
  fotos: string[];
  tecnico?: string;
  createdAt: Date;
  updatedAt: Date;
};
