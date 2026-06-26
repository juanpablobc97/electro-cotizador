import type { ColaboradorWithUser } from "@/lib/types";

const STORAGE_KEY = "electro-cotizador-colaboradores-v1";

export function colaboradorToRestoreRecord(c: ColaboradorWithUser) {
  return {
    id: c.id!,
    nombre: c.nombre,
    puesto: c.puesto,
    sueldo: c.sueldo ?? null,
    telefono: c.telefono ?? null,
    email: c.email ?? null,
    fechaIngreso: c.fechaIngreso
      ? c.fechaIngreso instanceof Date
        ? c.fechaIngreso.toISOString().slice(0, 10)
        : String(c.fechaIngreso).slice(0, 10)
      : null,
    notas: c.notas ?? null,
    activo: c.activo,
    userId: c.userId ?? null,
    createdAt:
      c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    updatedAt:
      c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
  };
}

function normalizeColaborador(c: ColaboradorWithUser): ColaboradorWithUser {
  return {
    ...c,
    fechaIngreso: c.fechaIngreso ? new Date(c.fechaIngreso) : undefined,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

export function saveColaboradoresLocalBackup(records: ColaboradorWithUser[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records.map(colaboradorToRestoreRecord)),
    );
  } catch {
    // Almacenamiento lleno o modo privado restrictivo.
  }
}

export function loadColaboradoresLocalBackup(): ColaboradorWithUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ColaboradorWithUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeColaborador);
  } catch {
    return [];
  }
}

export function mergeColaboradorBackups(
  ...lists: ColaboradorWithUser[][]
): ColaboradorWithUser[] {
  const byId = new Map<number, ColaboradorWithUser>();
  for (const list of lists) {
    for (const item of list) {
      if (item.id == null) continue;
      const existing = byId.get(item.id);
      if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
