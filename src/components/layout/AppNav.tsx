"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LOGO_PATH } from "@/lib/branding";
import { useSession } from "@/hooks/useSession";
import { CompanyContact } from "@/components/CompanyContact";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: string };

const baseNavItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/levantamientos", label: "Levantamientos", icon: "📋" },
  { href: "/cotizaciones", label: "Cotizaciones", icon: "💰" },
  { href: "/hojas-servicio", label: "Servicios", icon: "🔧" },
  { href: "/catalogo", label: "Catálogo", icon: "📦" },
];

const accountNavItem: NavItem = { href: "/perfil", label: "Mi cuenta", icon: "👤" };
const adminNavItems: NavItem[] = [
  { href: "/finanzas", label: "Finanzas", icon: "📊" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👷" },
];

const mobilePrimaryItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/cotizaciones", label: "Cotizaciones", icon: "💰" },
  { href: "/hojas-servicio", label: "Servicios", icon: "🔧" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const sidebarItems = useMemo(
    () =>
      role === "admin"
        ? [...baseNavItems, accountNavItem, ...adminNavItems]
        : [...baseNavItems, accountNavItem],
    [role],
  );

  const mobileMoreItems = useMemo(() => {
    const items: NavItem[] = [
      { href: "/levantamientos", label: "Levantamientos", icon: "📋" },
      { href: "/catalogo", label: "Catálogo", icon: "📦" },
      accountNavItem,
    ];
    if (role === "admin") items.push(...adminNavItems);
    return items;
  }, [role]);

  const moreIsActive = mobileMoreItems.some((item) => pathname === item.href);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand-navy-light bg-brand-navy min-[744px]:pl-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3 min-[744px]:hidden">
            <Image
              src={LOGO_PATH}
              alt="Bernal Instalaciones Eléctricas"
              width={44}
              height={44}
              className="rounded-lg"
              priority
            />
          </Link>
          <div className="hidden min-[744px]:block" />
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <Button
              size="sm"
              variant="ghost"
              className="hidden text-white/70 hover:bg-white/10 hover:text-white min-[744px]:inline-flex"
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Menú móvil: una sola fila + panel "Más" */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-brand-navy-light bg-brand-navy pb-[env(safe-area-inset-bottom)] min-[744px]:hidden">
        {moreOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/40"
              aria-label="Cerrar menú"
              onClick={() => setMoreOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 z-40 max-h-[60vh] overflow-y-auto border-t border-brand-navy-light bg-brand-navy px-2 py-2">
              {mobileMoreItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium",
                      active ? "bg-brand-gold/15 text-brand-gold" : "text-white/80",
                    )}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80"
                onClick={handleLogout}
              >
                <span className="text-lg">🚪</span>
                Cerrar sesión
              </button>
            </div>
          </>
        )}

        <div className="grid grid-cols-5">
          {mobilePrimaryItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px]",
                  active ? "text-brand-gold" : "text-white/60",
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px]",
              moreOpen || moreIsActive ? "text-brand-gold" : "text-white/60",
            )}
          >
            <span className="text-base">⋯</span>
            <span>Más</span>
          </button>
        </div>
      </nav>

      <aside className="hidden min-[744px]:fixed min-[744px]:inset-y-0 min-[744px]:left-0 min-[744px]:flex min-[744px]:w-64 min-[744px]:flex-col min-[744px]:border-r min-[744px]:border-brand-navy-light min-[744px]:bg-brand-navy">
        <Link href="/" className="border-b border-brand-navy-light px-4 py-5">
          <Image
            src={LOGO_PATH}
            alt="Bernal Instalaciones Eléctricas"
            width={200}
            height={200}
            className="mx-auto w-full max-w-[180px] rounded-lg"
            priority
          />
        </Link>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {!loading &&
            sidebarItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-gold/15 text-brand-gold"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
        </div>
        <div className="border-t border-brand-navy-light px-4 py-4 space-y-3">
          <CompanyContact variant="dark" compact />
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}
