import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session-node";
import { createUser, deleteUser, listUsers, resetUserPassword } from "@/lib/server/users";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

const userActionSchema = z.object({
  action: z.enum(["create", "delete", "reset-password"]),
  username: z.string().min(1).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(["admin", "colaborador"]).optional(),
  id: z.number().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const users = listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Error al listar usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = userActionSchema.parse(await request.json());

    if (body.action === "delete") {
      if (!body.id) {
        return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      }
      deleteUser(body.id, admin.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reset-password") {
      if (!body.id || !body.password) {
        return NextResponse.json({ error: "ID y contraseña requeridos" }, { status: 400 });
      }
      resetUserPassword(body.id, body.password);
      return NextResponse.json({ ok: true });
    }

    if (!body.username || !body.password || !body.role) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const user = createUser(body.username, body.password, body.role as UserRole);
    return NextResponse.json({ user });
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
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Error al guardar usuario" }, { status: 500 });
  }
}
