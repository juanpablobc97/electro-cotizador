"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import { SyncOfflineHelp } from "@/components/SyncOfflineHelp";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto min-h-screen max-w-6xl px-4 pt-4 max-[743px]:pb-[calc(5.5rem+env(safe-area-inset-bottom))] min-[744px]:ml-64 min-[744px]:pb-8">
        <SyncOfflineHelp />
        {children}
      </main>
    </>
  );
}
