import { db } from "@/lib/db";
import type { Client, Material, Quote, ServiceSheet, Survey } from "@/lib/types";

export type SyncPayload = {
  clients: Client[];
  materials: Material[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
  syncedAt: string;
};

export type SyncStatus = "idle" | "syncing" | "online" | "offline" | "error";

const MERGE_FLAG_KEY = "electro-cotizador-merged-v1";
const POLL_INTERVAL_MS = 8000;

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

function normalizePayload(payload: SyncPayload): SyncPayload {
  return {
    clients: payload.clients.map((c) => reviveDates(c, ["createdAt", "updatedAt"])),
    materials: payload.materials.map((m) => reviveDates(m, ["createdAt", "updatedAt"])),
    surveys: payload.surveys.map((s) => {
      const revived = reviveDates(s, ["fecha", "createdAt", "updatedAt"]);
      return {
        ...revived,
        partidas: revived.partidas ?? [],
        fotosGenerales: revived.fotosGenerales ?? {},
        fotos: revived.fotos ?? [],
      };
    }),
    quotes: payload.quotes.map((q) => reviveDates(q, ["fecha", "createdAt", "updatedAt"])),
    serviceSheets: payload.serviceSheets.map((s) =>
      reviveDates(s, ["fecha", "createdAt", "updatedAt"]),
    ),
    syncedAt: payload.syncedAt,
  };
}

export async function applyPayloadToDexie(payload: SyncPayload) {
  const data = normalizePayload(payload);

  await db.transaction(
    "rw",
    [db.clients, db.materials, db.surveys, db.quotes, db.serviceSheets],
    async () => {
      await db.clients.clear();
      await db.materials.clear();
      await db.surveys.clear();
      await db.quotes.clear();
      await db.serviceSheets.clear();

      if (data.clients.length) await db.clients.bulkPut(data.clients);
      if (data.materials.length) await db.materials.bulkPut(data.materials);
      if (data.surveys.length) await db.surveys.bulkPut(data.surveys);
      if (data.quotes.length) await db.quotes.bulkPut(data.quotes);
      if (data.serviceSheets.length) await db.serviceSheets.bulkPut(data.serviceSheets);
    },
  );
}

async function fetchSyncPayload(): Promise<SyncPayload> {
  const response = await fetch("/api/sync", {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
  return response.json();
}

async function exportLocalDexie() {
  return {
    clients: await db.clients.toArray(),
    materials: await db.materials.toArray(),
    surveys: await db.surveys.toArray(),
    quotes: await db.quotes.toArray(),
    serviceSheets: await db.serviceSheets.toArray(),
  };
}

function hasAnyRecords(data: Awaited<ReturnType<typeof exportLocalDexie>>) {
  return (
    data.clients.length +
      data.materials.length +
      data.surveys.length +
      data.quotes.length +
      data.serviceSheets.length >
    0
  );
}

async function mergeLocalOnceIfNeeded() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MERGE_FLAG_KEY)) return;

  const local = await exportLocalDexie();
  if (!hasAnyRecords(local)) {
    localStorage.setItem(MERGE_FLAG_KEY, "1");
    return;
  }

  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "merge", data: local }),
  });

  if (!response.ok) throw new Error("Merge failed");
  localStorage.setItem(MERGE_FLAG_KEY, "1");
}

export async function pullFromServer() {
  setStatus("syncing");
  try {
    await mergeLocalOnceIfNeeded();
    const payload = await fetchSyncPayload();
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

export const dataStore = {
  clients: {
    async create(data: Omit<Client, "id">) {
      const { record } = await postJson({ action: "upsert", table: "clients", record: data });
      await db.clients.put(record);
      await pullFromServer().catch(() => undefined);
      return record.id as number;
    },
    async update(id: number, data: Partial<Client>) {
      const existing = await db.clients.get(id);
      if (!existing) throw new Error("Cliente no encontrado");
      const record = { ...existing, ...data, id, updatedAt: new Date() };
      await postJson({ action: "upsert", table: "clients", record });
      await pullFromServer().catch(() => undefined);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "clients", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  materials: {
    async create(data: Omit<Material, "id">) {
      await postJson({ action: "upsert", table: "materials", record: data });
      await pullFromServer().catch(() => undefined);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "materials", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  surveys: {
    async create(data: Omit<Survey, "id">) {
      const { record } = await postJson({ action: "upsert", table: "surveys", record: data });
      await pullFromServer().catch(() => undefined);
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
      await pullFromServer().catch(() => undefined);
      return record.id as number;
    },
    async update(id: number, data: Partial<Quote>) {
      const existing = await db.quotes.get(id);
      if (!existing) throw new Error("Cotización no encontrada");
      const record = { ...existing, ...data, id, updatedAt: new Date() };
      await postJson({ action: "upsert", table: "quotes", record });
      await pullFromServer().catch(() => undefined);
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "quotes", id });
      await pullFromServer().catch(() => undefined);
    },
  },
  serviceSheets: {
    async create(data: Omit<ServiceSheet, "id">) {
      const { record } = await postJson({ action: "upsert", table: "serviceSheets", record: data });
      await pullFromServer().catch(() => undefined);
      return record.id as number;
    },
    async delete(id: number) {
      await postJson({ action: "delete", table: "serviceSheets", id });
      await pullFromServer().catch(() => undefined);
    },
  },
};
