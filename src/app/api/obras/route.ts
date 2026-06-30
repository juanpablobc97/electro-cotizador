import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session-node";
import { getObrasDashboard } from "@/lib/server/obras";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getObrasDashboard());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
    }
    console.error("Obras GET error:", error);
    return NextResponse.json({ error: "Error al cargar obras" }, { status: 500 });
  }
}
