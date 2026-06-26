import { NextResponse } from "next/server";
import { getPermissions } from "@/lib/auth/permissions";
import { getSessionUser, requireSession } from "@/lib/auth/session-node";
import {
  deleteClientCascade,
  deleteRecord,
  getFullSyncPayload,
  mergeLocalData,
  seedDefaultMaterialsIfEmpty,
  upsertRecord,
  type DeleteAction,
  type UpsertAction,
} from "@/lib/server/sqlite";
import { ensureColaboradoresTable, listColaboradores } from "@/lib/server/colaboradores";
import { seedAdminUserIfEmpty } from "@/lib/server/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    seedAdminUserIfEmpty();
    ensureColaboradoresTable();
    seedDefaultMaterialsIfEmpty();
    const payload = getFullSyncPayload();
    const user = await getSessionUser();
    if (user?.role === "admin") {
      return NextResponse.json({
        ...payload,
        colaboradores: listColaboradores(),
      });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "No se pudo leer la base de datos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const permissions = getPermissions(user.role);
    const body = await request.json();

    if (body.action === "merge") {
      if (!permissions.canDelete) {
        return NextResponse.json({ error: "No tienes permiso para importar datos" }, { status: 403 });
      }
      mergeLocalData(body.data);
      seedDefaultMaterialsIfEmpty();
      return NextResponse.json(getFullSyncPayload());
    }

    if (body.action === "upsert") {
      const action = body as UpsertAction;
      if (action.table === "materials" && !permissions.canManageCatalog) {
        return NextResponse.json({ error: "No tienes permiso para modificar el catálogo" }, { status: 403 });
      }
      const record = upsertRecord(action);
      return NextResponse.json({ record });
    }

    if (body.action === "delete") {
      if (!permissions.canDelete) {
        return NextResponse.json({ error: "No tienes permiso para eliminar registros" }, { status: 403 });
      }
      const action = body as DeleteAction;
      if (action.table === "materials" && !permissions.canManageCatalog) {
        return NextResponse.json({ error: "No tienes permiso para eliminar del catálogo" }, { status: 403 });
      }
      if (action.table === "clients") {
        deleteClientCascade(action.id);
      } else {
        deleteRecord(action);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "No se pudo guardar en la base de datos" }, { status: 500 });
  }
}
