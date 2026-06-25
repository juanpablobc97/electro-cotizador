"use client";

import { useEffect, useState } from "react";
import { getSyncStatus, subscribeSyncStatus } from "@/lib/sync";

export function SyncOfflineHelp() {
  const [{ status }, setState] = useState(getSyncStatus);

  useEffect(() => subscribeSyncStatus((nextStatus, syncedAt) => {
    setState({ status: nextStatus, lastSyncedAt: syncedAt });
  }), []);

  if (status !== "offline") return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">No hay conexión con el servidor</p>
      <p className="mt-1">
        No se pudo sincronizar con el servidor central. Verifica tu conexión a internet y que la
        app esté en línea.
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
        <li>Comprueba que tengas señal de WiFi o datos móviles</li>
        <li>Toca el indicador de sincronización arriba para reintentar</li>
        <li>Si el problema continúa, contacta al administrador del servidor</li>
      </ul>
    </div>
  );
}
