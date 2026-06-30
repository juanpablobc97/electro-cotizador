import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session-node";
import {
  createInventoryEvent,
  createInventoryItem,
  deleteInventoryEvent,
  deleteInventoryItem,
  getInventorySummary,
  listInventoryEvents,
  listInventoryItems,
  updateInventoryItem,
} from "@/lib/server/inventario";

export const runtime = "nodejs";

const itemFields = {
  tipo: z.enum(["herramienta", "vehiculo"]),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  placa: z.string().optional(),
  kmActual: z.number().optional(),
  colaboradorId: z.number().optional(),
  fechaAdquisicion: z.string().optional(),
  costo: z.number().optional(),
  estado: z.enum(["activo", "en_reparacion", "baja"]).optional(),
  proximoServicioKm: z.number().optional(),
  proximoServicioFecha: z.string().optional(),
  notas: z.string().optional(),
};

const eventFields = {
  itemId: z.number(),
  tipo: z.enum(["asignacion", "devolucion", "servicio", "reparacion", "km", "nota"]),
  fecha: z.string().min(1),
  colaboradorId: z.number().optional(),
  km: z.number().optional(),
  costo: z.number().optional(),
  descripcion: z.string().min(1),
  notas: z.string().optional(),
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_item"), ...itemFields }),
  z.object({ action: z.literal("update_item"), id: z.number(), ...itemFields }),
  z.object({ action: z.literal("delete_item"), id: z.number() }),
  z.object({ action: z.literal("create_event"), ...eventFields }),
  z.object({ action: z.literal("delete_event"), id: z.number() }),
]);

function handleAuthError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const itemIdParam = searchParams.get("itemId");
    const itemId = itemIdParam ? Number(itemIdParam) : undefined;

    return NextResponse.json({
      items: listInventoryItems(),
      events: listInventoryEvents(itemId),
      summary: getInventorySummary(),
    });
  } catch (error) {
    const auth = handleAuthError(error);
    if (auth) return auth;
    console.error("Inventario GET error:", error);
    return NextResponse.json({ error: "Error al cargar inventario" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = actionSchema.parse(await request.json());

    if (body.action === "delete_item") {
      deleteInventoryItem(body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_event") {
      deleteInventoryEvent(body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "create_event") {
      const event = createInventoryEvent({
        itemId: body.itemId,
        tipo: body.tipo,
        fecha: body.fecha,
        colaboradorId: body.colaboradorId,
        km: body.km,
        costo: body.costo,
        descripcion: body.descripcion,
        notas: body.notas,
      });
      return NextResponse.json({ event });
    }

    const payload = {
      tipo: body.tipo,
      nombre: body.nombre,
      descripcion: body.descripcion,
      marca: body.marca,
      modelo: body.modelo,
      numeroSerie: body.numeroSerie,
      placa: body.placa,
      kmActual: body.kmActual,
      colaboradorId: body.colaboradorId,
      fechaAdquisicion: body.fechaAdquisicion,
      costo: body.costo,
      estado: body.estado,
      proximoServicioKm: body.proximoServicioKm,
      proximoServicioFecha: body.proximoServicioFecha,
      notas: body.notas,
    };

    if (body.action === "update_item") {
      const item = updateInventoryItem(body.id, payload);
      return NextResponse.json({ item });
    }

    const item = createInventoryItem(payload);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const auth = handleAuthError(error);
    if (auth) return auth;
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Inventario POST error:", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
