import { NextResponse } from "next/server";
import { z } from "zod";
import { getPermissions } from "@/lib/auth/permissions";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { createSessionTokenNode, getSessionUser } from "@/lib/auth/session-node";
import { changeOwnPassword, verifyUserCredentials } from "@/lib/server/users";

export const runtime = "nodejs";

const authSchema = z.object({
  action: z.enum(["login", "logout", "change-password"]),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(4).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ user, permissions: getPermissions(user.role) });
}

export async function POST(request: Request) {
  try {
    const body = authSchema.parse(await request.json());

    if (body.action === "logout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(0), maxAge: 0 });
      return response;
    }

    if (body.action === "change-password") {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      if (!body.currentPassword || !body.newPassword) {
        return NextResponse.json({ error: "Contraseñas requeridas" }, { status: 400 });
      }
      changeOwnPassword(user.id, body.currentPassword, body.newPassword);
      return NextResponse.json({ ok: true });
    }

    if (!body.username || !body.password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    const account = verifyUserCredentials(body.username, body.password);
    if (!account) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const token = createSessionTokenNode(account.id);
    const response = NextResponse.json({
      ok: true,
      user: { id: account.id, username: account.username, role: account.role },
    });
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
