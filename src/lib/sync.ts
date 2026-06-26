import { db } from "@/lib/db";
import {
  colaboradorToRestoreRecord,
  loadColaboradoresLocalBackup,
  mergeColaboradorBackups,
  saveColaboradoresLocalBackup,
} from "@/lib/colaboradores-backup";
import type { Client, ColaboradorWithUser, Material, Quote, ServiceSheet, Survey } from "@/lib/types";

export type SyncPayload = {
  clients: Client[];
  materials: Material[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
  colaboradores?: ColaboradorWithUser[];
  syncedAt: string;
};

export type SyncStatus = "idle" | "syncing" | "online" | "offline" | "error";

type UserDataSlice = Pick<SyncPayload, "clients" | "surveys" | "quotes" | "serviceSheets">;

type LocalExport = {
  clients: Client[];
  materials: Material[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
};

const MERGE_FLAG_KEY = "electro-cotizador-merged-v1";
const POLL_INTERVAL_MS = 8000;

type SyncStore = {
  bulkPut: (items: { id?: number }[]) => Promise<unknown>;
  toArray: () => Promise<{ id?: number }[]>;
  delete: (id: number) => Promise<void>;
};

/** Fusiona datos del servidor en IndexedDB sin borrar todo el cache local. */
async function mergeServerIntoDexie(data: SyncPayload) {
  await db.transaction(
    "rw",
    [db.clients, db.materials, db.surveys, db.quotes, db.serviceSheets],
    async () => {
      await mergeTable(db.clients as unknown as SyncStore, data.clients);
      await mergeTable(db.materials as unknown as SyncStore, data.materials);
      await mergeTable(db.surveys as unknown as SyncStore, data.surveys);
      await mergeTable(db.quotes as unknown as SyncStore, data.quotes);
      await mergeTable(db.serviceSheets as unknown as SyncStore, data.serviceSheets);
    },
  );
}

async function mergeTable(store: SyncStore, records: { id?: number }[]) {
  if (records.length > 0) {
    await store.bulkPut(records);
  }

  const serverIds = new Set(records.map((record) => record.id).filter((id): id is number => id != null));
  if (serverIds.size === 0) return;

  const localRecords = await store.toArray();
  for (const local of localRecords) {
    if (local.id != null && !serverIds.has(local.id)) {
      await store.delete(local.id);
    }
  }
}

let syncStatus: SyncStatus = "idle";
let lastSyncedAt: string | null = null;
const listeners = new Set<(status: SyncStatus, syncedAt: string | null) => void>();

function setStatus(status: SyncStatus, syncedAt: string | null = lastSyncedAt) {
  syncStatus = status;
  if (syncedAt) lastSyncedAt = syncedAt;
  listeners.forEach((listener) => listener(syncStatus, lastSyncedAt));
}

export function getSyncStatus() {
  return { status: syncStatus, lastSyncedAt };
}

export function subscribeSyncStatus(
  listener: (status: SyncStatus, syncedAt: string | null) => void,
) {
  listeners.add(listener);
  listener(syncStatus, lastSyncedAt);
  return () => {
    listeners.delete(listener);
  };
}

function reviveDates<T extends Record<string, unknown>>(record: T, dateFields: string[]): T {
  const copy = { ...record } as Record<string, unknown>;
  for (const field of dateFields) {
    if (copy[field]) copy[field] = new Date(copy[field] as string);
  }
  return copy as T;
}

function normalizeColaborador(c: ColaboradorWithUser): ColaboradorWithUser {
  return {
    ...c,
    fechaIngreso: c.fechaIngreso ? new Date(c.fechaIngreso) : undefined,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

async function getLocalColaboradoresBackup(): Promise<ColaboradorWithUser[]> {
  return mergeColaboradorBackups(
    await db.colaboradoresCache.toArray(),
    loadColaboradoresLocalBackup(),
  );
}

async function restoreColaboradoresFromLocalBackup(): Promise<boolean> {
  const cached = await getLocalColaboradoresBackup();
  if (cached.length === 0) return false;

  const response = await fetch("/api/colaboradores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "restore",
      records: cached.map(colaboradorToRestoreRecord),
    }),
  });
  return response.ok;
}

async function syncColaboradoresCache(colaboradores: ColaboradorWithUser[] | undefined) {
  if (colaboradores === undefined) return;

  if (colaboradores.length > 0) {
    const normalized = colaboradores.map(normalizeColaborador);
    saveColaboradoresLocalBackup(normalized);
    await db.transaction("rw", db.colaboradoresCache, async () => {
      await db.colaboradoresCache.clear();
      await db.colaboradoresCache.bulkPut(normalized);
    });
    return;
  }

  await restoreColaboradoresFromLocalBackup();
}

function normalizePayload(payload: SyncPayload): SyncPayload {
  return {
    clients: payload.clients.map((c) => reviveDates(c, ["createdAt", "updatedAt"])),
    materials: payload.materials.map((m) => reviveDates(m, ["createdAt", "updatedAt"])),
    surveys: payload.surveys.map((s) => {
      const revived = reviveDates(s, ["fecha", "createdAt", "updatedAt"]);
      return {
        ...revived,
        partidas: revived.partidas ?? [],
        areas: revived.areas ?? [],
        fotosGenerales: revived.fotosGenerales ?? {},
        fotos: revived.fotos ?? [],
      };
    }),
    quotes: payload.quotes.map((q) => reviveDates(q, ["fecha", "createdAt", "updatedAt"])),
    serviceSheets: payload.serviceSheets.map((s) =>
      reviveDates(s, ["fecha", "createdAt", "updatedAt"]),
    ),
    colaboradores: payload.colaboradores?.map(normalizeColaborador),
    syncedAt: payload.syncedAt,
  };
}

function hasUserData(data: UserDataSlice): boolean {
  return (
    data.clients.length > 0 ||
    data.surveys.length > 0 ||
    data.quotes.length > 0 ||
    data.serviceSheets.length > 0
  );
}

async function exportLocalDexie(): Promise<LocalExport> {
  return {
    clients: await db.clients.toArray(),
    materials: await db.materials.toArray(),
    surveys: await db.surveys.toArray(),
    quotes: await db.quotes.toArray(),
    serviceSheets: await db.serviceSheets.toArray(),
  };
}

async function upsertAllToServer(local: LocalExport) {
  for (const client of local.clients) {
    await postJson({ action: "upsert", table: "clients", record: client });
  }
  for (const material of local.materials) {
    await postJson({ action: "upsert", table: "materials", record: material });
  }
  for (const survey of local.surveys) {
    await postJson({ action: "upsert", table: "surveys", record: survey });
  }
  for (const quote of local.quotes) {
    await postJson({ action: "upsert", table: "quotes", record: quote });
  }
  for (const sheet of local.serviceSheets) {
    await postJson({ action: "upsert", table: "serviceSheets", record: sheet });
  }
}

export async function applyPayloadToDexie(payload: SyncPayload) {
  let data = normalizePayload(payload);

  if (!hasUserData(data)) {
    const local = await exportLocalDexie();
    if (hasUserData(local)) {
      try {
        await upsertAllToServer(local);
        data = normalizePayload(await fetchSyncPayload());
      } catch {
        return;
      }
    }
  }

  await mergeServerIntoDexie(data);
}

async function fetchSyncPayload(): Promise<SyncPayload> {
  const response = await fetch("/api/sync", {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  return response.json();
}

async function mergeLocalOnceIfNeeded() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MERGE_FLAG_KEY)) return;

  const local = await exportLocalDexie();
  if (!hasUserData(local)) {
    localStorage.setItem(MERGE_FLAG_KEY, "1");
    return;
  }

  await upsertAllToServer(local);
  localStorage.setItem(MERGE_FLAG_KEY, "1");
}

export async function pullFromServer() {
  setStatus("syncing");
  try {
    await mergeLocalOnceIfNeeded();
    let payload = normalizePayload(await fetchSyncPayload());
    await syncColaboradoresCache(payload.colaboradores);
    if (payload.colaboradores !== undefined && payload.colaboradores.length === 0) {
      const restored = await restoreColaboradoresFromLocalBackup();
      if (restored) {
        payload = normalizePayload(await fetchSyncPayload());
      }
    }
    await applyPayloadToDexie(payload);
    setStatus("online", payload.syncedAt);
    return payload;
  } catch {
    setStatus("offline");
    throw new Error("offline");
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startSyncPolling() {
  if (typeof window === "undefined" || pollTimer) return;

  pullFromServer().catch(() => undefined);

  pollTimer = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    pullFromServer().catch(() => undefined);
  }, POLL_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      pullFromServer().catch(() => undefined);
    }
  });
}

async function postJson(body: unknown) {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}

async function persistAndSync<T extends { id?: number }>(
  store: { put: (record: T) => Promise<unknown> },
  record: T,
) {
  await store.put(record);
  await pullFromServer().catch(() => undefined);
}

export const dataStore = {
  clients: {
    async create(data: Omit<Client, "id">) {
      const { record } = await postJson({ action: "upsert", table: "clients", record: data });
      await persistAndSync(db.clients, record);
      return record.id as number;
    },
    async update(id: number, data: Partial<Client>) {
      const existing = await db.clients.get(id);
      if (!existing) throw new Error("Cliente no encontrado");
      const record = { ...existing, ...data, id, updatedAt: new Date() };
      const { record: saved } = await postJson({ action: "upsert", table: "clients", record });
      await persistAndSync(db.clients, saved);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "clients", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  materials: {
    async create(data: Omit<Material, "id">) {
      const { record } = await postJson({ action: "upsert", table: "materials", record: data });
      await persistAndSync(db.materials, record);
    },
    async updatePrice(id: number, precioUnitario: number) {
      const existing = await db.materials.get(id);
      if (!existing) throw new Error("Material no encontrado");
      const record = { ...existing, precioUnitario, updatedAt: new Date() };
      const { record: saved } = await postJson({ action: "upsert", table: "materials", record });
      await persistAndSync(db.materials, saved);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "materials", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  surveys: {
    async create(data: Omit<Survey, "id">) {
      const { record } = await postJson({ action: "upsert", table: "surveys", record: data });
      await persistAndSync(db.surveys, record);
      return record.id as number;
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "surveys", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  quotes: {
    async create(data: Omit<Quote, "id">) {
      const { record } = await postJson({ action: "upsert", table: "quotes", record: data });
      await persistAndSync(db.quotes, record);
      return record.id as number;
    },
    async update(id: number, data: Partial<Quote>) {
      const existing = await db.quotes.get(id);
      if (!existing) throw new Error("Cotización no encontrada");
      const record = { ...existing, ...data, id, updatedAt: new Date() };
      const { record: saved } = await postJson({ action: "upsert", table: "quotes", record });
      await persistAndSync(db.quotes, saved);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "quotes", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  serviceSheets: {
    async create(data: Omit<ServiceSheet, "id">) {
      const { record } = await postJson({ action: "upsert", table: "serviceSheets", record: data });
      await persistAndSync(db.serviceSheets, record);
      return record.id as number;
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "serviceSheets", id });
      await pullFromServer().catch(() => undefined);
    },
  },
};
