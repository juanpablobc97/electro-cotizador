"use client";

import { useEffect, useState } from "react";
import { getSyncStatus, pullFromServer, subscribeSyncStatus, type SyncStatus } from "@/lib/sync";
import { cn } from "@/lib/utils";

const labels: Record<SyncStatus, string> = {
  idle: "Conectando...",
  syncing: "Sincronizando...",
  online: "Sincronizado",
  offline: "Sin conexión",
  error: "Error de sync",
};

export function SyncStatusBadge() {
  const [{ status, lastSyncedAt }, setState] = useState(getSyncStatus);

  useEffect(() => subscribeSyncStatus((nextStatus, syncedAt) => {
    setState({ status: nextStatus, lastSyncedAt: syncedAt });
  }), []);

  async function handleManualSync() {
    await pullFromServer().catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={handleManualSync}
      title={
        status === "offline"
          ? "Sin conexión al servidor. Verifica tu internet y toca para reintentar."
          : lastSyncedAt
            ? `Última sync: ${new Date(lastSyncedAt).toLocaleString("es-MX")}`
            : "Toca para sincronizar"
      }
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition",
        status === "online" && "bg-emerald-500/20 text-emerald-300",
        status === "syncing" && "bg-brand-gold/20 text-brand-gold",
        status === "offline" && "bg-red-500/20 text-red-300",
        (status === "idle" || status === "error") && "bg-white/10 text-white/70",
      )}
    >
      {labels[status]}
    </button>
  );
}
