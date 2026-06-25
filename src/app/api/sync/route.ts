import { NextResponse } from "next/server";
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

export const runtime = "nodejs";

export async function GET() {
  try {
    seedDefaultMaterialsIfEmpty();
    return NextResponse.json(getFullSyncPayload());
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: "No se pudo leer la base de datos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "merge") {
      mergeLocalData(body.data);
      seedDefaultMaterialsIfEmpty();
      return NextResponse.json(getFullSyncPayload());
    }

    if (body.action === "upsert") {
      const record = upsertRecord(body as UpsertAction);
      return NextResponse.json({ record });
    }

    if (body.action === "delete") {
      const action = body as DeleteAction;
      if (action.table === "clients") {
        deleteClientCascade(action.id);
      } else {
        deleteRecord(action);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: "No se pudo guardar en la base de datos" }, { status: 500 });
  }
}
