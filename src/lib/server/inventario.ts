import type {
  InventoryEvent,
  InventoryEventType,
  InventoryEventWithRefs,
  InventoryItem,
  InventoryItemInput,
  InventoryItemStatus,
  InventoryItemType,
  InventoryItemWithRefs,
  InventorySummary,
} from "@/lib/types";
import { ensureColaboradoresTable } from "./colaboradores";
import { getDb } from "./sqlite";

function rowToItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as number,
    tipo: row.tipo as InventoryItemType,
    nombre: row.nombre as string,
    descripcion: (row.descripcion as string) || undefined,
    marca: (row.marca as string) || undefined,
    modelo: (row.modelo as string) || undefined,
    numeroSerie: (row.numeroSerie as string) || undefined,
    placa: (row.placa as string) || undefined,
    kmActual: row.kmActual != null ? Number(row.kmActual) : undefined,
    colaboradorId: row.colaboradorId != null ? Number(row.colaboradorId) : undefined,
    fechaAdquisicion: row.fechaAdquisicion
      ? new Date(row.fechaAdquisicion as string)
      : undefined,
    costo: row.costo != null ? Number(row.costo) : undefined,
    estado: row.estado as InventoryItemStatus,
    proximoServicioKm:
      row.proximoServicioKm != null ? Number(row.proximoServicioKm) : undefined,
    proximoServicioFecha: row.proximoServicioFecha
      ? new Date(row.proximoServicioFecha as string)
      : undefined,
    notas: (row.notas as string) || undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

function rowToEvent(row: Record<string, unknown>): InventoryEvent {
  return {
    id: row.id as number,
    itemId: row.itemId as number,
    tipo: row.tipo as InventoryEventType,
    fecha: new Date(row.fecha as string),
    colaboradorId: row.colaboradorId != null ? Number(row.colaboradorId) : undefined,
    km: row.km != null ? Number(row.km) : undefined,
    costo: row.costo != null ? Number(row.costo) : undefined,
    descripcion: row.descripcion as string,
    notas: (row.notas as string) || undefined,
    createdAt: new Date(row.createdAt as string),
  };
}

export function ensureInventarioTables() {
  ensureColaboradoresTable();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('herramienta', 'vehiculo')),
      nombre TEXT NOT NULL,
      descripcion TEXT,
      marca TEXT,
      modelo TEXT,
      numeroSerie TEXT,
      placa TEXT,
      kmActual REAL,
      colaboradorId INTEGER,
      fechaAdquisicion TEXT,
      costo REAL,
      estado TEXT NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'en_reparacion', 'baja')),
      proximoServicioKm REAL,
      proximoServicioFecha TEXT,
      notas TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (colaboradorId) REFERENCES colaboradores(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemId INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('asignacion', 'devolucion', 'servicio', 'reparacion', 'km', 'nota')),
      fecha TEXT NOT NULL,
      colaboradorId INTEGER,
      km REAL,
      costo REAL,
      descripcion TEXT NOT NULL,
      notas TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES inventory_items(id) ON DELETE CASCADE,
      FOREIGN KEY (colaboradorId) REFERENCES colaboradores(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_events_item ON inventory_events(itemId);
  `);
}

export function getInventorySummary(): InventorySummary {
  ensureInventarioTables();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
        SUM(CASE WHEN tipo = 'herramienta' THEN 1 ELSE 0 END) AS herramientas,
        SUM(CASE WHEN tipo = 'vehiculo' THEN 1 ELSE 0 END) AS vehiculos,
        SUM(CASE WHEN colaboradorId IS NOT NULL AND estado != 'baja' THEN 1 ELSE 0 END) AS asignadas,
        SUM(CASE WHEN estado = 'en_reparacion' THEN 1 ELSE 0 END) AS enReparacion
       FROM inventory_items`,
    )
    .get() as Record<string, number>;

  return {
    herramientas: Number(rows.herramientas) || 0,
    vehiculos: Number(rows.vehiculos) || 0,
    asignadas: Number(rows.asignadas) || 0,
    enReparacion: Number(rows.enReparacion) || 0,
  };
}

export function listInventoryItems(): InventoryItemWithRefs[] {
  ensureInventarioTables();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.*, c.nombre AS colaboradorNombre
       FROM inventory_items i
       LEFT JOIN colaboradores c ON c.id = i.colaboradorId
       ORDER BY i.tipo, i.nombre COLLATE NOCASE`,
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    ...rowToItem(row),
    colaboradorNombre: (row.colaboradorNombre as string) || undefined,
  }));
}

export function listInventoryEvents(itemId?: number): InventoryEventWithRefs[] {
  ensureInventarioTables();
  const db = getDb();
  let query = `
    SELECT e.*, c.nombre AS colaboradorNombre, i.nombre AS itemNombre
    FROM inventory_events e
    LEFT JOIN colaboradores c ON c.id = e.colaboradorId
    LEFT JOIN inventory_items i ON i.id = e.itemId
  `;
  const params: Record<string, number> = {};
  if (itemId != null) {
    query += ` WHERE e.itemId = @itemId`;
    params.itemId = itemId;
  }
  query += ` ORDER BY e.fecha DESC, e.id DESC`;

  const rows = db.prepare(query).all(params) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...rowToEvent(row),
    colaboradorNombre: (row.colaboradorNombre as string) || undefined,
    itemNombre: (row.itemNombre as string) || undefined,
  }));
}

function getItemById(id: number): InventoryItem | null {
  ensureInventarioTables();
  const db = getDb();
  const row = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToItem(row) : null;
}

function validateItemInput(input: InventoryItemInput) {
  if (!input.nombre.trim()) throw new Error("El nombre es requerido");
}

export function createInventoryItem(input: InventoryItemInput): InventoryItem {
  ensureInventarioTables();
  validateItemInput(input);
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO inventory_items (
        tipo, nombre, descripcion, marca, modelo, numeroSerie, placa, kmActual,
        colaboradorId, fechaAdquisicion, costo, estado, proximoServicioKm,
        proximoServicioFecha, notas, createdAt, updatedAt
      ) VALUES (
        @tipo, @nombre, @descripcion, @marca, @modelo, @numeroSerie, @placa, @kmActual,
        @colaboradorId, @fechaAdquisicion, @costo, @estado, @proximoServicioKm,
        @proximoServicioFecha, @notas, @createdAt, @updatedAt
      )`,
    )
    .run({
      tipo: input.tipo,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      marca: input.marca?.trim() || null,
      modelo: input.modelo?.trim() || null,
      numeroSerie: input.numeroSerie?.trim() || null,
      placa: input.placa?.trim() || null,
      kmActual: input.kmActual ?? null,
      colaboradorId: input.colaboradorId ?? null,
      fechaAdquisicion: input.fechaAdquisicion
        ? new Date(input.fechaAdquisicion).toISOString()
        : null,
      costo: input.costo ?? null,
      estado: input.estado ?? "activo",
      proximoServicioKm: input.proximoServicioKm ?? null,
      proximoServicioFecha: input.proximoServicioFecha
        ? new Date(input.proximoServicioFecha).toISOString()
        : null,
      notas: input.notas?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

  return getItemById(Number(result.lastInsertRowid))!;
}

export function updateInventoryItem(id: number, input: InventoryItemInput): InventoryItem {
  ensureInventarioTables();
  validateItemInput(input);
  if (!getItemById(id)) throw new Error("Artículo no encontrado");

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE inventory_items SET
      tipo=@tipo, nombre=@nombre, descripcion=@descripcion, marca=@marca, modelo=@modelo,
      numeroSerie=@numeroSerie, placa=@placa, kmActual=@kmActual, colaboradorId=@colaboradorId,
      fechaAdquisicion=@fechaAdquisicion, costo=@costo, estado=@estado,
      proximoServicioKm=@proximoServicioKm, proximoServicioFecha=@proximoServicioFecha,
      notas=@notas, updatedAt=@updatedAt
     WHERE id=@id`,
  ).run({
    id,
    tipo: input.tipo,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    marca: input.marca?.trim() || null,
    modelo: input.modelo?.trim() || null,
    numeroSerie: input.numeroSerie?.trim() || null,
    placa: input.placa?.trim() || null,
    kmActual: input.kmActual ?? null,
    colaboradorId: input.colaboradorId ?? null,
    fechaAdquisicion: input.fechaAdquisicion
      ? new Date(input.fechaAdquisicion).toISOString()
      : null,
    costo: input.costo ?? null,
    estado: input.estado ?? "activo",
    proximoServicioKm: input.proximoServicioKm ?? null,
    proximoServicioFecha: input.proximoServicioFecha
      ? new Date(input.proximoServicioFecha).toISOString()
      : null,
    notas: input.notas?.trim() || null,
    updatedAt: now,
  });

  return getItemById(id)!;
}

export function deleteInventoryItem(id: number) {
  ensureInventarioTables();
  const db = getDb();
  const result = db.prepare("DELETE FROM inventory_items WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("Artículo no encontrado");
}

export type InventoryEventInput = {
  itemId: number;
  tipo: InventoryEventType;
  fecha: string;
  colaboradorId?: number;
  km?: number;
  costo?: number;
  descripcion: string;
  notas?: string;
};

function applyEventSideEffects(item: InventoryItem, input: InventoryEventInput) {
  const db = getDb();
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { id: item.id, updatedAt: now };

  if (input.tipo === "asignacion") {
    if (!input.colaboradorId) throw new Error("Selecciona el colaborador");
    updates.colaboradorId = input.colaboradorId;
    updates.estado = "activo";
  }

  if (input.tipo === "devolucion") {
    updates.colaboradorId = null;
  }

  if (input.tipo === "km" && input.km != null) {
    updates.kmActual = input.km;
  }

  if (input.tipo === "reparacion") {
    updates.estado = "en_reparacion";
  }

  if (input.tipo === "servicio") {
    updates.estado = "activo";
    if (input.km != null) updates.proximoServicioKm = input.km;
  }

  const fields = Object.keys(updates).filter((key) => key !== "id" && key !== "updatedAt");
  if (fields.length === 0) {
    db.prepare("UPDATE inventory_items SET updatedAt = ? WHERE id = ?").run(now, item.id);
    return;
  }

  const setClause = [...fields, "updatedAt"]
    .map((field) => `${field}=@${field}`)
    .join(", ");
  db.prepare(`UPDATE inventory_items SET ${setClause} WHERE id=@id`).run(updates);
}

export function createInventoryEvent(input: InventoryEventInput): InventoryEvent {
  ensureInventarioTables();
  const item = getItemById(input.itemId);
  if (!item) throw new Error("Artículo no encontrado");
  if (!input.descripcion.trim()) throw new Error("La descripción es requerida");

  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO inventory_events (
        itemId, tipo, fecha, colaboradorId, km, costo, descripcion, notas, createdAt
      ) VALUES (
        @itemId, @tipo, @fecha, @colaboradorId, @km, @costo, @descripcion, @notas, @createdAt
      )`,
    )
    .run({
      itemId: input.itemId,
      tipo: input.tipo,
      fecha: new Date(input.fecha).toISOString(),
      colaboradorId: input.colaboradorId ?? null,
      km: input.km ?? null,
      costo: input.costo ?? null,
      descripcion: input.descripcion.trim(),
      notas: input.notas?.trim() || null,
      createdAt: now,
    });

  applyEventSideEffects(item, input);

  const row = db
    .prepare("SELECT * FROM inventory_events WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return rowToEvent(row);
}

export function deleteInventoryEvent(id: number) {
  ensureInventarioTables();
  const db = getDb();
  const result = db.prepare("DELETE FROM inventory_events WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("Registro no encontrado");
}
