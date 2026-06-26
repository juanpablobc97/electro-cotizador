"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LOGO_PATH } from "@/lib/branding";
import { useSession } from "@/hooks/useSession";
import { CompanyContact } from "@/components/CompanyContact";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/levantamientos", label: "Levantamientos", icon: "📋" },
  { href: "/cotizaciones", label: "Cotizaciones", icon: "💰" },
  { href: "/hojas-servicio", label: "Servicios", icon: "🔧" },
  { href: "/catalogo", label: "Catálogo", icon: "📦" },
];

const accountNavItem = { href: "/perfil", label: "Mi cuenta", icon: "👤" };
const adminNavItems = [
  { href: "/finanzas", label: "Finanzas", icon: "📊" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👷" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useSession();

  const items =
    role === "admin"
      ? [...baseNavItems, accountNavItem, ...adminNavItems]
      : [...baseNavItems, accountNavItem];

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  }

  const gridCols = items.length <= 6 ? "grid-cols-6" : "grid-cols-4";

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-brand-navy-light bg-brand-navy md:pl-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-3 md:hidden">
            <Image
              src={LOGO_PATH}
              alt="Bernal Instalaciones Eléctricas"
              width={44}
              height={44}
              className="rounded-lg"
              priority
            />
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <SyncStatusBadge />
            <Button
              size="sm"
              variant="ghost"
              className="hidden text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
              onClick={handleLogout}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-brand-navy-light bg-brand-navy md:hidden">
        <div className={cn("grid", gridCols)}>
          {items.map((item) => {
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
        </div>
      </nav>

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-brand-navy-light md:bg-brand-navy">
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
            items.map((item) => {
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
