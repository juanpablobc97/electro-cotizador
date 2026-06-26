import { createUser, deleteUser, getUserById, setUserCatalogPricesPermission } from "@/lib/server/users";
import type { Colaborador, ColaboradorWithUser } from "@/lib/types";
import { readJsonBackup, writeJsonBackup } from "./backup";
import { getDb } from "./sqlite";

type ColaboradorRow = Record<string, unknown>;

function rowToColaborador(row: Record<string, unknown>): Colaborador {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    puesto: (row.puesto as string) ?? "",
    sueldo: row.sueldo != null ? Number(row.sueldo) : undefined,
    telefono: (row.telefono as string) || undefined,
    email: (row.email as string) || undefined,
    fechaIngreso: row.fechaIngreso ? new Date(row.fechaIngreso as string) : undefined,
    notas: (row.notas as string) || undefined,
    activo: Boolean(row.activo),
    userId: row.userId != null ? Number(row.userId) : undefined,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

export function ensureColaboradoresTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      puesto TEXT NOT NULL DEFAULT '',
      sueldo REAL,
      telefono TEXT,
      email TEXT,
      fechaIngreso TEXT,
      notas TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      userId INTEGER UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  restoreColaboradoresFromJsonIfEmpty();
}

function snapshotColaboradoresToJson() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM colaboradores ORDER BY id").all() as ColaboradorRow[];
  if (rows.length > 0) writeJsonBackup("colaboradores", rows);
}

function restoreColaboradoresFromJsonIfEmpty() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM colaboradores").get() as { c: number }).c;
  if (count > 0) {
    snapshotColaboradoresToJson();
    return;
  }

  const backup = readJsonBackup<ColaboradorRow[]>("colaboradores");
  if (!backup?.length) return;

  const insert = db.prepare(
    `INSERT INTO colaboradores (
      id, nombre, puesto, sueldo, telefono, email, fechaIngreso, notas, activo, userId, createdAt, updatedAt
    ) VALUES (
      @id, @nombre, @puesto, @sueldo, @telefono, @email, @fechaIngreso, @notas, @activo, @userId, @createdAt, @updatedAt
    )`,
  );

  const tx = db.transaction((records: ColaboradorRow[]) => {
    for (const row of records) {
      insert.run({
        id: row.id,
        nombre: row.nombre,
        puesto: row.puesto ?? "",
        sueldo: row.sueldo ?? null,
        telefono: row.telefono ?? null,
        email: row.email ?? null,
        fechaIngreso: row.fechaIngreso ?? null,
        notas: row.notas ?? null,
        activo: row.activo ?? 1,
        userId: row.userId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }
  });
  tx(backup);
}

export function restoreColaboradores(records: ColaboradorRow[]) {
  ensureColaboradoresTable();
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM colaboradores").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO colaboradores (
      id, nombre, puesto, sueldo, telefono, email, fechaIngreso, notas, activo, userId, createdAt, updatedAt
    ) VALUES (
      @id, @nombre, @puesto, @sueldo, @telefono, @email, @fechaIngreso, @notas, @activo, @userId, @createdAt, @updatedAt
    )`,
  );

  const now = new Date().toISOString();
  const tx = db.transaction((items: ColaboradorRow[]) => {
    for (const row of items) {
      insert.run({
        id: row.id,
        nombre: row.nombre,
        puesto: row.puesto ?? "",
        sueldo: row.sueldo ?? null,
        telefono: row.telefono ?? null,
        email: row.email ?? null,
        fechaIngreso: row.fechaIngreso ?? null,
        notas: row.notas ?? null,
        activo: row.activo === false || row.activo === 0 ? 0 : 1,
        userId: row.userId ?? null,
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
      });
    }
  });
  tx(records);
  snapshotColaboradoresToJson();
}

export function listColaboradores(): ColaboradorWithUser[] {
  ensureColaboradoresTable();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*, u.username, u.canEditCatalogPrices
       FROM colaboradores c
       LEFT JOIN users u ON u.id = c.userId
       ORDER BY c.activo DESC, c.nombre COLLATE NOCASE`,
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    ...rowToColaborador(row),
    username: (row.username as string) || undefined,
    canEditCatalogPrices: Boolean(row.canEditCatalogPrices),
  }));
}

export function getColaboradorById(id: number): Colaborador | null {
  ensureColaboradoresTable();
  const db = getDb();
  const row = db.prepare("SELECT * FROM colaboradores WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToColaborador(row) : null;
}

type ColaboradorInput = {
  nombre: string;
  puesto: string;
  sueldo?: number;
  telefono?: string;
  email?: string;
  fechaIngreso?: string;
  notas?: string;
  activo?: boolean;
};

function validateInput(input: ColaboradorInput) {
  if (!input.nombre.trim()) throw new Error("El nombre es requerido");
}

export function createColaborador(input: ColaboradorInput): Colaborador {
  ensureColaboradoresTable();
  validateInput(input);
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO colaboradores (
        nombre, puesto, sueldo, telefono, email, fechaIngreso, notas, activo, createdAt, updatedAt
      ) VALUES (
        @nombre, @puesto, @sueldo, @telefono, @email, @fechaIngreso, @notas, @activo, @createdAt, @updatedAt
      )`,
    )
    .run({
      nombre: input.nombre.trim(),
      puesto: input.puesto.trim(),
      sueldo: input.sueldo ?? null,
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      fechaIngreso: input.fechaIngreso || null,
      notas: input.notas?.trim() || null,
      activo: input.activo === false ? 0 : 1,
      createdAt: now,
      updatedAt: now,
    });

  snapshotColaboradoresToJson();
  return getColaboradorById(Number(result.lastInsertRowid))!;
}

export function updateColaborador(id: number, input: ColaboradorInput): Colaborador {
  ensureColaboradoresTable();
  validateInput(input);
  const existing = getColaboradorById(id);
  if (!existing) throw new Error("Colaborador no encontrado");

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE colaboradores SET
      nombre=@nombre, puesto=@puesto, sueldo=@sueldo, telefono=@telefono, email=@email,
      fechaIngreso=@fechaIngreso, notas=@notas, activo=@activo, updatedAt=@updatedAt
     WHERE id=@id`,
  ).run({
    id,
    nombre: input.nombre.trim(),
    puesto: input.puesto.trim(),
    sueldo: input.sueldo ?? null,
    telefono: input.telefono?.trim() || null,
    email: input.email?.trim() || null,
    fechaIngreso: input.fechaIngreso || null,
    notas: input.notas?.trim() || null,
    activo: input.activo === false ? 0 : 1,
    updatedAt: now,
  });

  snapshotColaboradoresToJson();
  return getColaboradorById(id)!;
}

export function createUserForColaborador(
  colaboradorId: number,
  username: string,
  password: string,
) {
  ensureColaboradoresTable();
  const colaborador = getColaboradorById(colaboradorId);
  if (!colaborador) throw new Error("Colaborador no encontrado");
  if (colaborador.userId) throw new Error("Este colaborador ya tiene acceso a la app");

  const user = createUser(username, password, "colaborador");
  const db = getDb();
  db.prepare("UPDATE colaboradores SET userId = ?, updatedAt = ? WHERE id = ?").run(
    user.id,
    new Date().toISOString(),
    colaboradorId,
  );

  snapshotColaboradoresToJson();
  return user;
}

export function deleteColaborador(id: number, requesterId: number, removeUser = false) {
  ensureColaboradoresTable();
  const colaborador = getColaboradorById(id);
  if (!colaborador) throw new Error("Colaborador no encontrado");

  const db = getDb();
  if (colaborador.userId) {
    if (removeUser) {
      deleteUser(colaborador.userId, requesterId);
    } else {
      db.prepare("UPDATE colaboradores SET userId = NULL WHERE id = ?").run(id);
    }
  }

  db.prepare("DELETE FROM colaboradores WHERE id = ?").run(id);
  snapshotColaboradoresToJson();
}

export function getColaboradorByUserId(userId: number): Colaborador | null {
  ensureColaboradoresTable();
  const db = getDb();
  const row = db.prepare("SELECT * FROM colaboradores WHERE userId = ?").get(userId) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToColaborador(row) : null;
}

export function setColaboradorCatalogPricesPermission(colaboradorId: number, enabled: boolean) {
  ensureColaboradoresTable();
  const colaborador = getColaboradorById(colaboradorId);
  if (!colaborador) throw new Error("Colaborador no encontrado");
  if (!colaborador.userId) {
    throw new Error("Este colaborador no tiene acceso a la app");
  }
  setUserCatalogPricesPermission(colaborador.userId, enabled);
}

export function getLinkedUser(colaboradorId: number) {
  const colaborador = getColaboradorById(colaboradorId);
  if (!colaborador?.userId) return null;
  return getUserById(colaborador.userId);
}
