"use client";

import { useEffect } from "react";
import { seedDefaultMaterials } from "@/lib/db";
import { startSyncPolling } from "@/lib/sync";

export function DbInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    seedDefaultMaterials().catch(console.error);
    startSyncPolling();
  }, []);

  return <>{children}</>;
}
