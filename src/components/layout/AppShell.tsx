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
      <main className="mx-auto min-h-screen max-w-6xl px-4 pb-24 pt-4 md:ml-64 md:pb-8">
        <SyncOfflineHelp />
        {children}
      </main>
    </>
  );
}
