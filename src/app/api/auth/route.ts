import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionTokenNode, verifyCredentials } from "@/lib/auth/session-node";
import { getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

const loginSchema = z.object({
  action: z.enum(["login", "logout"]),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());

    if (body.action === "logout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", { ...getSessionCookieOptions(0), maxAge: 0 });
      return response;
    }

    if (!body.username || !body.password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    if (!verifyCredentials(body.username, body.password)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const token = await createSessionTokenNode();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
  }
}
