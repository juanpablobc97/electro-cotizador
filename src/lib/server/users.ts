import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { User, UserRole } from "@/lib/types";
import { getDb } from "./sqlite";

function env(name: string): string | undefined {
  return process.env[name];
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    username: row.username as string,
    role: row.role as UserRole,
    createdAt: new Date(row.createdAt as string),
  };
}

export function ensureUsersTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'colaborador')),
      createdAt TEXT NOT NULL
    );
  `);
}

export function seedAdminUserIfEmpty() {
  ensureUsersTable();
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
  if (count > 0) return;

  const username =
    env("AUTH_USERNAME") ?? (env("NODE_ENV") === "development" ? "admin" : "");
  const password =
    env("AUTH_PASSWORD") ?? (env("NODE_ENV") === "development" ? "admin" : "");

  if (!username || !password) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (username, passwordHash, role, createdAt) VALUES (?, ?, 'admin', ?)`,
  ).run(username, hashPassword(password), now);
}

export function verifyUserCredentials(
  username: string,
  password: string,
): { id: number; username: string; role: UserRole } | null {
  seedAdminUserIfEmpty();
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, passwordHash, role FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as Record<string, unknown> | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.passwordHash as string)) return null;

  return {
    id: row.id as number,
    username: row.username as string,
    role: row.role as UserRole,
  };
}

export function listUsers(): User[] {
  seedAdminUserIfEmpty();
  const db = getDb();
  return (db.prepare("SELECT id, username, role, createdAt FROM users ORDER BY username").all() as Record<string, unknown>[]).map(
    rowToUser,
  );
}

export function getUserById(id: number): User | null {
  seedAdminUserIfEmpty();
  const db = getDb();
  const row = db
    .prepare("SELECT id, username, role, createdAt FROM users WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function createUser(
  username: string,
  password: string,
  role: UserRole,
): User {
  seedAdminUserIfEmpty();
  const db = getDb();
  const trimmed = username.trim();
  if (!trimmed) throw new Error("Usuario requerido");
  if (password.length < 4) throw new Error("La contraseña debe tener al menos 4 caracteres");

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(trimmed);
  if (existing) throw new Error("Ese usuario ya existe");

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO users (username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?)`,
    )
    .run(trimmed, hashPassword(password), role, now);

  return getUserById(Number(result.lastInsertRowid))!;
}

export function deleteUser(id: number, requesterId: number) {
  seedAdminUserIfEmpty();
  const db = getDb();

  if (id === requesterId) throw new Error("No puedes eliminar tu propio usuario");

  const admins = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as {
    c: number;
  }).c;
  const target = getUserById(id);
  if (!target) throw new Error("Usuario no encontrado");
  if (target.role === "admin" && admins <= 1) {
    throw new Error("Debe quedar al menos un administrador");
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

function getPasswordHash(userId: number): string | null {
  const db = getDb();
  const row = db.prepare("SELECT passwordHash FROM users WHERE id = ?").get(userId) as
    | { passwordHash: string }
    | undefined;
  return row?.passwordHash ?? null;
}

export function changeOwnPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  seedAdminUserIfEmpty();
  if (newPassword.length < 4) {
    throw new Error("La nueva contraseña debe tener al menos 4 caracteres");
  }

  const stored = getPasswordHash(userId);
  if (!stored || !verifyPassword(currentPassword, stored)) {
    throw new Error("La contraseña actual no es correcta");
  }

  const db = getDb();
  db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    userId,
  );
}

export function resetUserPassword(userId: number, newPassword: string) {
  seedAdminUserIfEmpty();
  if (newPassword.length < 4) {
    throw new Error("La contraseña debe tener al menos 4 caracteres");
  }
  if (!getUserById(userId)) throw new Error("Usuario no encontrado");

  const db = getDb();
  db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    userId,
  );
}
