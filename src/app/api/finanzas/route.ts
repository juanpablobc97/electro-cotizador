import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session-node";
import {
  createMovement,
  deleteMovement,
  getMovementSummary,
  listMovements,
  updateMovement,
} from "@/lib/server/finanzas";

export const runtime = "nodejs";

const movementFields = {
  tipo: z.enum(["ingreso", "egreso"]),
  categoria: z.enum([
    "anticipo_obra",
    "cobro_liquidacion",
    "cobro_parcial",
    "otro_ingreso",
    "pago_colaborador",
    "gasto_obra",
    "gasto_operativo",
    "material",
    "otro_egreso",
  ]),
  monto: z.number().positive(),
  fecha: z.string().min(1),
  concepto: z.string().min(1),
  formaPago: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]),
  clientId: z.number().optional(),
  quoteId: z.number().optional(),
  serviceSheetId: z.number().optional(),
  colaboradorId: z.number().optional(),
  colaboradorPaymentType: z
    .enum(["por_obra", "por_dia", "por_proyecto", "nomina_fija"])
    .optional(),
  notas: z.string().optional(),
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...movementFields }),
  z.object({ action: z.literal("update"), id: z.number(), ...movementFields }),
  z.object({ action: z.literal("delete"), id: z.number() }),
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
    const month = searchParams.get("month") ?? undefined;

    return NextResponse.json({
      movements: listMovements(month),
      summary: getMovementSummary(month),
    });
  } catch (error) {
    const auth = handleAuthError(error);
    if (auth) return auth;
    console.error("Finanzas GET error:", error);
    return NextResponse.json({ error: "Error al cargar finanzas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = actionSchema.parse(await request.json());

    if (body.action === "delete") {
      deleteMovement(body.id);
      return NextResponse.json({ ok: true });
    }

    const payload = {
      tipo: body.tipo,
      categoria: body.categoria,
      monto: body.monto,
      fecha: body.fecha,
      concepto: body.concepto,
      formaPago: body.formaPago,
      clientId: body.clientId,
      quoteId: body.quoteId,
      serviceSheetId: body.serviceSheetId,
      colaboradorId: body.colaboradorId,
      colaboradorPaymentType: body.colaboradorPaymentType,
      notas: body.notas,
    };

    if (body.action === "update") {
      const movement = updateMovement(body.id, payload);
      return NextResponse.json({ movement });
    }

    const movement = createMovement(payload);
    return NextResponse.json({ movement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const auth = handleAuthError(error);
    if (auth) return auth;
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Finanzas POST error:", error);
    return NextResponse.json({ error: "Error al guardar movimiento" }, { status: 500 });
  }
}
