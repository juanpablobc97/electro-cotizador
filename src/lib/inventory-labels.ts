import type {
  InventoryEventType,
  InventoryItemStatus,
  InventoryItemType,
} from "./types";

export const INVENTORY_TIPO_LABELS: Record<InventoryItemType, string> = {
  herramienta: "Herramienta",
  vehiculo: "Vehículo",
};

export const INVENTORY_ESTADO_LABELS: Record<InventoryItemStatus, string> = {
  activo: "Activo",
  en_reparacion: "En reparación",
  baja: "Baja",
};

export const INVENTORY_EVENT_LABELS: Record<InventoryEventType, string> = {
  asignacion: "Asignación",
  devolucion: "Devolución",
  servicio: "Servicio",
  reparacion: "Reparación",
  km: "Registro de km",
  nota: "Nota",
};

export const INVENTORY_ESTADO_OPTIONS = Object.entries(INVENTORY_ESTADO_LABELS).map(
  ([value, label]) => ({ value, label }),
);
