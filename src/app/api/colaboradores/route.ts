import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session-node";
import {
  createColaborador,
  createUserForColaborador,
  deleteColaborador,
  getLinkedUser,
  listColaboradores,
  restoreColaboradores,
  updateColaborador,
} from "@/lib/server/colaboradores";
import { resetUserPassword } from "@/lib/server/users";

export const runtime = "nodejs";

const colaboradorFields = {
  nombre: z.string().min(1),
  puesto: z.string().default(""),
  sueldo: z.number().nonnegative().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  fechaIngreso: z.string().optional(),
  notas: z.string().optional(),
  activo: z.boolean().optional(),
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...colaboradorFields }),
  z.object({ action: z.literal("update"), id: z.number(), ...colaboradorFields }),
  z.object({
    action: z.literal("delete"),
    id: z.number(),
    removeUser: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("create-user"),
    id: z.number(),
    username: z.string().min(1),
    password: z.string().min(4),
  }),
  z.object({
    action: z.literal("reset-password"),
    id: z.number(),
    password: z.string().min(4),
  }),
  z.object({
    action: z.literal("restore"),
    records: z.array(
      z.object({
        id: z.number(),
        nombre: z.string().min(1),
        puesto: z.string().optional(),
        sueldo: z.number().optional().nullable(),
        telefono: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        fechaIngreso: z.string().optional().nullable(),
        notas: z.string().optional().nullable(),
        activo: z.boolean().optional(),
        userId: z.number().optional().nullable(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    ),
  }),
]);

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ colaboradores: listColaboradores() });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    console.error("Colaboradores GET error:", error);
    return NextResponse.json({ error: "Error al listar colaboradores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = actionSchema.parse(await request.json());

    if (body.action === "delete") {
      deleteColaborador(body.id, admin.id, body.removeUser ?? false);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "create-user") {
      const user = createUserForColaborador(body.id, body.username, body.password);
      return NextResponse.json({ user });
    }

    if (body.action === "reset-password") {
      const linked = getLinkedUser(body.id);
      if (!linked) {
        return NextResponse.json({ error: "Este colaborador no tiene usuario" }, { status: 400 });
      }
      resetUserPassword(linked.id, body.password);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore") {
      restoreColaboradores(body.records);
      return NextResponse.json({ colaboradores: listColaboradores() });
    }

    const payload = {
      nombre: body.nombre,
      puesto: body.puesto,
      sueldo: body.sueldo,
      telefono: body.telefono,
      email: body.email,
      fechaIngreso: body.fechaIngreso,
      notas: body.notas,
      activo: body.activo,
    };

    if (body.action === "update") {
      const colaborador = updateColaborador(body.id, payload);
      return NextResponse.json({ colaborador });
    }

    const colaborador = createColaborador(payload);
    return NextResponse.json({ colaborador });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Colaboradores POST error:", error);
    return NextResponse.json({ error: "Error al guardar colaborador" }, { status: 500 });
  }
}
