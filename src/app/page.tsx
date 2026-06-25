"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyContact } from "@/components/CompanyContact";
import { db } from "@/lib/db";

export default function HomePage() {
  const clients = useLiveQuery(() => db.clients.count()) ?? 0;
  const surveys = useLiveQuery(() => db.surveys.count()) ?? 0;
  const quotes = useLiveQuery(() => db.quotes.count()) ?? 0;
  const serviceSheets = useLiveQuery(() => db.serviceSheets.count()) ?? 0;
  const materials = useLiveQuery(() => db.materials.count()) ?? 0;

  const stats = [
    { label: "Clientes", value: clients, href: "/clientes", color: "bg-blue-50 text-blue-700" },
    {
      label: "Levantamientos",
      value: surveys,
      href: "/levantamientos",
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Cotizaciones",
      value: quotes,
      href: "/cotizaciones",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Servicios",
      value: serviceSheets,
      href: "/hojas-servicio",
      color: "bg-teal-50 text-teal-700",
    },
    {
      label: "Materiales",
      value: materials,
      href: "/catalogo",
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Panel de control"
          subtitle="Gestiona clientes, levantamientos en obra y cotizaciones eléctricas"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map((stat) => (
            <Link
              key={stat.href}
              href={stat.href}
              className={`rounded-xl p-4 ${stat.color} transition hover:opacity-90`}
            >
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm font-medium">{stat.label}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Acciones rápidas" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/clientes/nuevo">
            <Button className="w-full" size="lg">
              + Nuevo cliente
            </Button>
          </Link>
          <Link href="/levantamientos/nuevo">
            <Button className="w-full" size="lg" variant="secondary">
              + Nuevo levantamiento
            </Button>
          </Link>
          <Link href="/cotizaciones/nuevo">
            <Button className="w-full" size="lg" variant="secondary">
              + Nueva cotización
            </Button>
          </Link>
          <Link href="/hojas-servicio/nuevo">
            <Button className="w-full" size="lg" variant="secondary">
              + Hoja de servicio
            </Button>
          </Link>
          <Link href="/catalogo">
            <Button className="w-full" size="lg" variant="ghost">
              Ver catálogo de materiales
            </Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Flujo de trabajo"
          subtitle="Sigue estos pasos para cada proyecto"
        />
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
              1
            </span>
            Registra al cliente con sus datos de contacto y dirección.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
              2
            </span>
            Realiza el levantamiento en sitio: mediciones, circuitos, fotos y notas.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
              3
            </span>
            Genera la cotización con materiales del catálogo y mano de obra.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
              4
            </span>
            Exporta el PDF y envíalo al cliente.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
              5
            </span>
            Registra la hoja de servicio al terminar el trabajo y envíala al cliente para sus garantías.
          </li>
        </ol>
      </Card>

      <Card>
        <CardHeader title="Datos de la empresa" />
        <CompanyContact />
      </Card>
    </div>
  );
}
