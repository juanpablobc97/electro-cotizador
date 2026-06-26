import type {
  FinanceCategory,
  FinanceMovement,
  FinanceMovementType,
  FinanceMovementWithRefs,
  FinanceSummary,
  PaymentMethod,
  CollaboratorPaymentType,
} from "@/lib/types";
import { ensureColaboradoresTable } from "./colaboradores";
import { getDb } from "./sqlite";

function rowToMovement(row: Record<string, unknown>): FinanceMovement {
  return {
    id: row.id as number,
    tipo: row.tipo as FinanceMovementType,
    categoria: row.categoria as FinanceCategory,
    monto: Number(row.monto),
    fecha: new Date(row.fecha as string),
    concepto: row.concepto as string,
    formaPago: row.formaPago as PaymentMethod,
    clientId: row.clientId != null ? Number(row.clientId) : undefined,
    quoteId: row.quoteId != null ? Number(row.quoteId) : undefined,
    serviceSheetId: row.serviceSheetId != null ? Number(row.serviceSheetId) : undefined,
    colaboradorId: row.colaboradorId != null ? Number(row.colaboradorId) : undefined,
    colaboradorPaymentType: (row.colaboradorPaymentType as CollaboratorPaymentType) || undefined,
    notas: (row.notas as string) || undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

export function ensureFinanzasTable() {
  ensureColaboradoresTable();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
      categoria TEXT NOT NULL,
      monto REAL NOT NULL,
      fecha TEXT NOT NULL,
      concepto TEXT NOT NULL,
      formaPago TEXT NOT NULL DEFAULT 'efectivo',
      clientId INTEGER,
      quoteId INTEGER,
      serviceSheetId INTEGER,
      colaboradorId INTEGER,
      colaboradorPaymentType TEXT,
      notas TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE SET NULL,
      FOREIGN KEY (colaboradorId) REFERENCES colaboradores(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_finance_movements_fecha ON finance_movements(fecha);
  `);
}

function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function listMovements(month?: string): FinanceMovementWithRefs[] {
  ensureFinanzasTable();
  const db = getDb();

  let query = `
    SELECT m.*, c.nombre AS clientNombre, q.numero AS quoteNumero, col.nombre AS colaboradorNombre
    FROM finance_movements m
    LEFT JOIN clients c ON c.id = m.clientId
    LEFT JOIN quotes q ON q.id = m.quoteId
    LEFT JOIN colaboradores col ON col.id = m.colaboradorId
  `;
  const params: Record<string, string> = {};

  if (month) {
    const { from, to } = monthRange(month);
    query += ` WHERE m.fecha >= @from AND m.fecha <= @to`;
    params.from = from;
    params.to = `${to}T23:59:59.999Z`;
  }

  query += ` ORDER BY m.fecha DESC, m.id DESC`;

  const rows = db.prepare(query).all(params) as Record<string, unknown>[];
  return rows.map((row) => ({
    ...rowToMovement(row),
    clientNombre: (row.clientNombre as string) || undefined,
    quoteNumero: (row.quoteNumero as string) || undefined,
    colaboradorNombre: (row.colaboradorNombre as string) || undefined,
  }));
}

export function getMovementSummary(month?: string): FinanceSummary {
  ensureFinanzasTable();
  const db = getDb();

  let query = `
    SELECT tipo, SUM(monto) AS total
    FROM finance_movements
  `;
  const params: Record<string, string> = {};

  if (month) {
    const { from, to } = monthRange(month);
    query += ` WHERE fecha >= @from AND fecha <= @to`;
    params.from = from;
    params.to = `${to}T23:59:59.999Z`;
  }

  query += ` GROUP BY tipo`;

  const rows = db.prepare(query).all(params) as { tipo: FinanceMovementType; total: number }[];
  let ingresos = 0;
  let egresos = 0;
  for (const row of rows) {
    if (row.tipo === "ingreso") ingresos = Number(row.total) || 0;
    if (row.tipo === "egreso") egresos = Number(row.total) || 0;
  }

  return { ingresos, egresos, balance: ingresos - egresos };
}

export type FinanceMovementInput = {
  tipo: FinanceMovementType;
  categoria: FinanceCategory;
  monto: number;
  fecha: string;
  concepto: string;
  formaPago: PaymentMethod;
  clientId?: number;
  quoteId?: number;
  serviceSheetId?: number;
  colaboradorId?: number;
  colaboradorPaymentType?: CollaboratorPaymentType;
  notas?: string;
};

function validateInput(input: FinanceMovementInput) {
  if (!input.concepto.trim()) throw new Error("El concepto es requerido");
  if (!input.monto || input.monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!input.fecha) throw new Error("La fecha es requerida");
  if (input.categoria === "pago_colaborador" && !input.colaboradorId) {
    throw new Error("Selecciona el colaborador para este pago");
  }
}

export function createMovement(input: FinanceMovementInput): FinanceMovement {
  ensureFinanzasTable();
  validateInput(input);
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO finance_movements (
        tipo, categoria, monto, fecha, concepto, formaPago,
        clientId, quoteId, serviceSheetId, colaboradorId, colaboradorPaymentType,
        notas, createdAt, updatedAt
      ) VALUES (
        @tipo, @categoria, @monto, @fecha, @concepto, @formaPago,
        @clientId, @quoteId, @serviceSheetId, @colaboradorId, @colaboradorPaymentType,
        @notas, @createdAt, @updatedAt
      )`,
    )
    .run({
      tipo: input.tipo,
      categoria: input.categoria,
      monto: input.monto,
      fecha: new Date(input.fecha).toISOString(),
      concepto: input.concepto.trim(),
      formaPago: input.formaPago,
      clientId: input.clientId ?? null,
      quoteId: input.quoteId ?? null,
      serviceSheetId: input.serviceSheetId ?? null,
      colaboradorId: input.colaboradorId ?? null,
      colaboradorPaymentType: input.colaboradorPaymentType ?? null,
      notas: input.notas?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });

  return getMovementById(Number(result.lastInsertRowid))!;
}

export function getMovementById(id: number): FinanceMovement | null {
  ensureFinanzasTable();
  const db = getDb();
  const row = db.prepare("SELECT * FROM finance_movements WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMovement(row) : null;
}

export function updateMovement(id: number, input: FinanceMovementInput): FinanceMovement {
  ensureFinanzasTable();
  validateInput(input);
  if (!getMovementById(id)) throw new Error("Movimiento no encontrado");

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE finance_movements SET
      tipo=@tipo, categoria=@categoria, monto=@monto, fecha=@fecha, concepto=@concepto,
      formaPago=@formaPago, clientId=@clientId, quoteId=@quoteId, serviceSheetId=@serviceSheetId,
      colaboradorId=@colaboradorId, colaboradorPaymentType=@colaboradorPaymentType,
      notas=@notas, updatedAt=@updatedAt
     WHERE id=@id`,
  ).run({
    id,
    tipo: input.tipo,
    categoria: input.categoria,
    monto: input.monto,
    fecha: new Date(input.fecha).toISOString(),
    concepto: input.concepto.trim(),
    formaPago: input.formaPago,
    clientId: input.clientId ?? null,
    quoteId: input.quoteId ?? null,
    serviceSheetId: input.serviceSheetId ?? null,
    colaboradorId: input.colaboradorId ?? null,
    colaboradorPaymentType: input.colaboradorPaymentType ?? null,
    notas: input.notas?.trim() || null,
    updatedAt: now,
  });

  return getMovementById(id)!;
}

export function deleteMovement(id: number) {
  ensureFinanzasTable();
  const db = getDb();
  const result = db.prepare("DELETE FROM finance_movements WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("Movimiento no encontrado");
}

export function getCollaboratorPaymentTotals(colaboradorId: number): number {
  ensureFinanzasTable();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM finance_movements
       WHERE colaboradorId = ? AND categoria = 'pago_colaborador'`,
    )
    .get(colaboradorId) as { total: number };
  return Number(row.total) || 0;
}
