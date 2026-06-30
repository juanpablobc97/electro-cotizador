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

export type WorkDifficulty = "baja" | "media" | "alta";

export type WorkUnit = "pza" | "m" | "servicio" | "hr" | "rollo";

export type GeneralPhotoKey =
  | "fachada"
  | "acometida"
  | "medidor"
  | "tablero"
  | "interiorTablero"
  | "rutaGeneral"
  | "areaTrabajo";

export type GeneralPhotos = Partial<Record<GeneralPhotoKey, string[]>>;

export type PhotovoltaicData = {
  tipoProyecto?: "interconectado" | "aislado" | "hibrido";
  reciboCfe?: string;
  consumoKwhBimestral?: number;
  tarifaCfe?: string;
  demandaObjetivo?: string;
  capacidadEstimadaKw?: number;
  numeroPaneles?: number;
  potenciaPanel?: number;
  tipoInversor?: "central" | "microinversores" | "hibrido";
  voltajeInterconexion?: string;
  tipoTecho?: "losa" | "lamina" | "teja" | "estructura_metalica";
  areaDisponible?: string;
  orientacionTecho?: string;
  inclinacionAproximada?: string;
  sombras?: boolean;
  obstaculosTecho?: string;
  distanciaPanelesInversor?: string;
  distanciaInversorTablero?: string;
  requiereEstructura?: boolean;
  requiereCanalizacion?: boolean;
  requiereProteccionesDcAc?: boolean;
  requiereSistemaTierras?: boolean;
  requiereTramiteCfe?: boolean;
  fotosReciboCfe?: string[];
  fotosTecho?: string[];
  fotosTablero?: string[];
  fotosAcometida?: string[];
  fotosRutaCanalizacion?: string[];
};

export type SurveyWorkItem = {
  id: string;
  tipoTrabajo: string;
  tipoTrabajoPersonalizado?: string;
  area: string;
  cantidad: number;
  unidad: WorkUnit | string;
  descripcion: string;
  descripcionManual: boolean;
  materialIncluido: boolean;
  dificultad: WorkDifficulty;
  alturaTrabajo: string;
  requiereRanura: boolean;
  requiereCanalizacion: boolean;
  fotos: string[];
  observaciones?: string;
  fotovoltaico?: PhotovoltaicData;
};

export type SurveyArea = {
  id: string;
  nombre: string;
  partidas: SurveyWorkItem[];
};

export type CustomWorkType = {
  id?: number;
  nombre: string;
  createdAt: Date;
  updatedAt: Date;
};

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
  capacidadInterruptorPrincipal?: string;
  espaciosTablero?: number;
  sistemaTierraFisica?: boolean;
  observacionesGenerales?: string;
  notas?: string;
  areas: SurveyArea[];
  partidas: SurveyWorkItem[];
  fotosGenerales: GeneralPhotos;
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
  cantidad: number;
  unidad: WorkUnit | string;
  tarifaUnidad: number;
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

export type UserRole = "admin" | "colaborador";

export type User = {
  id: number;
  username: string;
  role: UserRole;
  canEditCatalogPrices?: boolean;
  createdAt: Date;
};

export type Colaborador = {
  id?: number;
  nombre: string;
  puesto: string;
  sueldo?: number;
  telefono?: string;
  email?: string;
  fechaIngreso?: Date;
  notas?: string;
  activo: boolean;
  userId?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ColaboradorWithUser = Colaborador & {
  username?: string;
  canEditCatalogPrices?: boolean;
};

export type FinanceMovementType = "ingreso" | "egreso";

export type FinanceCategory =
  | "anticipo_obra"
  | "cobro_liquidacion"
  | "cobro_parcial"
  | "otro_ingreso"
  | "pago_colaborador"
  | "gasto_obra"
  | "gasto_operativo"
  | "material"
  | "otro_egreso";

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "otro";

export type CollaboratorPaymentType = "por_obra" | "por_dia" | "por_proyecto" | "nomina_fija";

export type FinanceMovement = {
  id?: number;
  tipo: FinanceMovementType;
  categoria: FinanceCategory;
  monto: number;
  fecha: Date;
  concepto: string;
  formaPago: PaymentMethod;
  clientId?: number;
  quoteId?: number;
  serviceSheetId?: number;
  colaboradorId?: number;
  colaboradorPaymentType?: CollaboratorPaymentType;
  notas?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceMovementWithRefs = FinanceMovement & {
  clientNombre?: string;
  quoteNumero?: string;
  colaboradorNombre?: string;
};

export type FinanceSummary = {
  ingresos: number;
  egresos: number;
  balance: number;
};

export type ObraEtapa =
  | "levantamiento"
  | "cotizada"
  | "aceptada"
  | "en_obra"
  | "cobrada"
  | "rechazada";

export type ObraItem = {
  id: string;
  etapa: ObraEtapa;
  clientId: number;
  clientNombre: string;
  titulo: string;
  surveyId?: number;
  quoteId?: number;
  serviceSheetId?: number;
  quoteNumero?: string;
  quoteTotal?: number;
  cobrado: number;
  saldo: number;
  fecha: string;
  direccion?: string;
};

export type ObrasSummary = {
  totalPorCobrar: number;
  obrasActivas: number;
  porEtapa: Record<ObraEtapa, number>;
};

export type ObrasDashboard = {
  obras: ObraItem[];
  receivables: ObraItem[];
  summary: ObrasSummary;
};
