import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Client, CustomWorkType, Material, Quote, ServiceSheet, Survey } from "../types";

const DB_DIR = process.env.DATABASE_DIR
  ? path.resolve(process.env.DATABASE_DIR)
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "electro-cotizador.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(DB_DIR, { recursive: true });
  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      empresa TEXT,
      telefono TEXT NOT NULL,
      email TEXT,
      direccion TEXT NOT NULL,
      notas TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      unidad TEXT NOT NULL,
      precioUnitario REAL NOT NULL,
      categoria TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      direccionObra TEXT NOT NULL,
      estado TEXT NOT NULL,
      tipoInstalacion TEXT NOT NULL,
      voltaje TEXT NOT NULL,
      numCircuitos INTEGER NOT NULL,
      metrosCable REAL NOT NULL,
      numContactos INTEGER NOT NULL,
      numLuminarias INTEGER NOT NULL,
      requiereTablero INTEGER NOT NULL,
      notas TEXT,
      fotos TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      surveyId INTEGER,
      numero TEXT NOT NULL,
      fecha TEXT NOT NULL,
      validezDias INTEGER NOT NULL,
      materiales TEXT NOT NULL,
      manoObra TEXT NOT NULL,
      notas TEXT,
      ivaPorcentaje REAL NOT NULL,
      estado TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS service_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      quoteId INTEGER,
      numero TEXT NOT NULL,
      fecha TEXT NOT NULL,
      tipoServicio TEXT NOT NULL,
      direccionServicio TEXT NOT NULL,
      descripcionTrabajo TEXT NOT NULL,
      materiales TEXT NOT NULL,
      garantiaMeses INTEGER NOT NULL,
      notas TEXT,
      fotos TEXT NOT NULL,
      tecnico TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS custom_work_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  migrateSurveysTable(dbInstance);

  return dbInstance;
}

function migrateSurveysTable(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(surveys)").all() as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  const additions: [string, string][] = [
    ["capacidadInterruptorPrincipal", "TEXT"],
    ["espaciosTablero", "INTEGER"],
    ["sistemaTierraFisica", "INTEGER"],
    ["observacionesGenerales", "TEXT"],
    ["partidas", "TEXT NOT NULL DEFAULT '[]'"],
    ["fotosGenerales", "TEXT NOT NULL DEFAULT '{}'"],
    ["areas", "TEXT NOT NULL DEFAULT '[]'"],
  ];

  for (const [name, definition] of additions) {
    if (!names.has(name)) {
      db.exec(`ALTER TABLE surveys ADD COLUMN ${name} ${definition}`);
    }
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function surveyToBindParams(survey: Survey) {
  return {
    clientId: survey.clientId,
    titulo: survey.titulo,
    fecha: toIso(survey.fecha),
    direccionObra: survey.direccionObra,
    estado: survey.estado,
    tipoInstalacion: survey.tipoInstalacion,
    voltaje: survey.voltaje,
    numCircuitos: survey.numCircuitos,
    metrosCable: survey.metrosCable,
    numContactos: survey.numContactos,
    numLuminarias: survey.numLuminarias,
    requiereTablero: survey.requiereTablero ? 1 : 0,
    capacidadInterruptorPrincipal: survey.capacidadInterruptorPrincipal ?? null,
    espaciosTablero: survey.espaciosTablero ?? null,
    sistemaTierraFisica:
      survey.sistemaTierraFisica == null ? null : survey.sistemaTierraFisica ? 1 : 0,
    observacionesGenerales: survey.observacionesGenerales ?? null,
    notas: survey.notas ?? null,
    partidas: JSON.stringify(survey.partidas ?? []),
    areas: JSON.stringify(survey.areas ?? []),
    fotosGenerales: JSON.stringify(survey.fotosGenerales ?? {}),
    fotos: JSON.stringify(survey.fotos ?? []),
    createdAt: toIso(survey.createdAt),
    updatedAt: toIso(survey.updatedAt),
  };
}

function parseDate(value: string): Date {
  return new Date(value);
}

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    empresa: (row.empresa as string) || undefined,
    telefono: row.telefono as string,
    email: (row.email as string) || undefined,
    direccion: row.direccion as string,
    notas: (row.notas as string) || undefined,
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

function rowToMaterial(row: Record<string, unknown>): Material {
  return {
    id: row.id as number,
    codigo: row.codigo as string,
    nombre: row.nombre as string,
    unidad: row.unidad as Material["unidad"],
    precioUnitario: row.precioUnitario as number,
    categoria: row.categoria as string,
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

export function getMaterialById(id: number): Material | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM materials WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToMaterial(row) : null;
}

function rowToCustomWorkType(row: Record<string, unknown>): CustomWorkType {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

function rowToSurvey(row: Record<string, unknown>): Survey {
  return {
    id: row.id as number,
    clientId: row.clientId as number,
    titulo: row.titulo as string,
    fecha: parseDate(row.fecha as string),
    direccionObra: row.direccionObra as string,
    estado: row.estado as Survey["estado"],
    tipoInstalacion: row.tipoInstalacion as string,
    voltaje: row.voltaje as string,
    numCircuitos: row.numCircuitos as number,
    metrosCable: row.metrosCable as number,
    numContactos: row.numContactos as number,
    numLuminarias: row.numLuminarias as number,
    requiereTablero: Boolean(row.requiereTablero),
    capacidadInterruptorPrincipal: (row.capacidadInterruptorPrincipal as string) || undefined,
    espaciosTablero: row.espaciosTablero != null ? Number(row.espaciosTablero) : undefined,
    sistemaTierraFisica:
      row.sistemaTierraFisica != null ? Boolean(row.sistemaTierraFisica) : undefined,
    observacionesGenerales: (row.observacionesGenerales as string) || undefined,
    notas: (row.notas as string) || undefined,
    partidas: parseJsonField(row.partidas, []),
    areas: parseJsonField(row.areas, []),
    fotosGenerales: parseJsonField(row.fotosGenerales, {}),
    fotos: parseJsonField(row.fotos, []),
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

function rowToQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as number,
    clientId: row.clientId as number,
    surveyId: (row.surveyId as number) || undefined,
    numero: row.numero as string,
    fecha: parseDate(row.fecha as string),
    validezDias: row.validezDias as number,
    materiales: JSON.parse(row.materiales as string),
    manoObra: JSON.parse(row.manoObra as string),
    notas: (row.notas as string) || undefined,
    ivaPorcentaje: row.ivaPorcentaje as number,
    estado: row.estado as Quote["estado"],
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

function rowToServiceSheet(row: Record<string, unknown>): ServiceSheet {
  return {
    id: row.id as number,
    clientId: row.clientId as number,
    quoteId: (row.quoteId as number) || undefined,
    numero: row.numero as string,
    fecha: parseDate(row.fecha as string),
    tipoServicio: row.tipoServicio as ServiceSheet["tipoServicio"],
    direccionServicio: row.direccionServicio as string,
    descripcionTrabajo: row.descripcionTrabajo as string,
    materiales: JSON.parse(row.materiales as string),
    garantiaMeses: row.garantiaMeses as number,
    notas: (row.notas as string) || undefined,
    fotos: JSON.parse(row.fotos as string),
    tecnico: (row.tecnico as string) || undefined,
    createdAt: parseDate(row.createdAt as string),
    updatedAt: parseDate(row.updatedAt as string),
  };
}

export type SyncPayload = {
  clients: Client[];
  materials: Material[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
  customWorkTypes: CustomWorkType[];
  syncedAt: string;
};

export function getFullSyncPayload(): SyncPayload {
  const db = getDb();

  return {
    clients: (db.prepare("SELECT * FROM clients ORDER BY nombre").all() as Record<string, unknown>[]).map(rowToClient),
    materials: (db.prepare("SELECT * FROM materials ORDER BY categoria, nombre").all() as Record<string, unknown>[]).map(rowToMaterial),
    surveys: (db.prepare("SELECT * FROM surveys ORDER BY fecha DESC").all() as Record<string, unknown>[]).map(rowToSurvey),
    quotes: (db.prepare("SELECT * FROM quotes ORDER BY fecha DESC").all() as Record<string, unknown>[]).map(rowToQuote),
    serviceSheets: (db
      .prepare("SELECT * FROM service_sheets ORDER BY fecha DESC")
      .all() as Record<string, unknown>[])
      .map(rowToServiceSheet),
    customWorkTypes: (db
      .prepare("SELECT * FROM custom_work_types ORDER BY nombre COLLATE NOCASE")
      .all() as Record<string, unknown>[])
      .map(rowToCustomWorkType),
    syncedAt: new Date().toISOString(),
  };
}

export function isDatabaseEmpty(): boolean {
  const db = getDb();
  const count =
    (db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }).c +
    (db.prepare("SELECT COUNT(*) as c FROM materials").get() as { c: number }).c +
    (db.prepare("SELECT COUNT(*) as c FROM surveys").get() as { c: number }).c +
    (db.prepare("SELECT COUNT(*) as c FROM quotes").get() as { c: number }).c +
    (db.prepare("SELECT COUNT(*) as c FROM service_sheets").get() as { c: number }).c;
  return count === 0;
}

export function seedDefaultMaterialsIfEmpty() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM materials").get() as { c: number }).c;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO materials (codigo, nombre, unidad, precioUnitario, categoria, createdAt, updatedAt)
    VALUES (@codigo, @nombre, @unidad, @precioUnitario, @categoria, @createdAt, @updatedAt)
  `);

  const defaults = [
    { codigo: "CAB-THW12", nombre: "Cable THW-2 calibre 12", unidad: "m", precioUnitario: 18.5, categoria: "Cableado" },
    { codigo: "CAB-THW10", nombre: "Cable THW-2 calibre 10", unidad: "m", precioUnitario: 28.0, categoria: "Cableado" },
    { codigo: "INT-SIMP", nombre: "Interruptor sencillo", unidad: "pza", precioUnitario: 45.0, categoria: "Apagadores" },
    { codigo: "CONT-2P", nombre: "Contacto duplex polarizado", unidad: "pza", precioUnitario: 55.0, categoria: "Contactos" },
    { codigo: "TBR-8C", nombre: "Tablero de distribución 8 circuitos", unidad: "pza", precioUnitario: 1850.0, categoria: "Tableros" },
    { codigo: "TBR-12C", nombre: "Tablero de distribución 12 circuitos", unidad: "pza", precioUnitario: 2450.0, categoria: "Tableros" },
    { codigo: "LUM-LED", nombre: "Luminaria LED empotrable 12W", unidad: "pza", precioUnitario: 320.0, categoria: "Iluminación" },
    { codigo: "TB-ORG", nombre: "Tubería conduit 13mm (3m)", unidad: "pza", precioUnitario: 85.0, categoria: "Canalización" },
  ];

  const tx = db.transaction(() => {
    for (const item of defaults) {
      insert.run({ ...item, createdAt: now, updatedAt: now });
    }
  });
  tx();
}

type MergeInput = {
  clients: Client[];
  materials: Material[];
  surveys: Survey[];
  quotes: Quote[];
  serviceSheets: ServiceSheet[];
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function updateOrInsertById(update: () => Database.RunResult, insert: () => void): void {
  const result = update();
  if (result.changes === 0) insert();
}

export function mergeLocalData(input: MergeInput) {
  const db = getDb();

  const tx = db.transaction(() => {
    const clientIdMap = new Map<number, number>();
    const materialIdMap = new Map<number, number>();
    const surveyIdMap = new Map<number, number>();
    const quoteIdMap = new Map<number, number>();

    const insertClient = db.prepare(`
      INSERT INTO clients (nombre, empresa, telefono, email, direccion, notas, createdAt, updatedAt)
      VALUES (@nombre, @empresa, @telefono, @email, @direccion, @notas, @createdAt, @updatedAt)
    `);

    for (const client of input.clients) {
      const oldId = client.id;
      const result = insertClient.run({
        nombre: client.nombre,
        empresa: client.empresa ?? null,
        telefono: client.telefono,
        email: client.email ?? null,
        direccion: client.direccion,
        notas: client.notas ?? null,
        createdAt: toIso(client.createdAt),
        updatedAt: toIso(client.updatedAt),
      });
      if (oldId != null) clientIdMap.set(oldId, Number(result.lastInsertRowid));
    }

    const insertMaterial = db.prepare(`
      INSERT INTO materials (codigo, nombre, unidad, precioUnitario, categoria, createdAt, updatedAt)
      VALUES (@codigo, @nombre, @unidad, @precioUnitario, @categoria, @createdAt, @updatedAt)
    `);

    const existingMaterialCodes = new Map<string, number>(
      (db.prepare("SELECT id, codigo FROM materials").all() as { id: number; codigo: string }[]).map(
        (row) => [row.codigo, row.id],
      ),
    );

    for (const material of input.materials) {
      const oldId = material.id;
      const existingId = existingMaterialCodes.get(material.codigo);
      if (existingId != null) {
        if (oldId != null) materialIdMap.set(oldId, existingId);
        continue;
      }

      const result = insertMaterial.run({
        codigo: material.codigo,
        nombre: material.nombre,
        unidad: material.unidad,
        precioUnitario: material.precioUnitario,
        categoria: material.categoria,
        createdAt: toIso(material.createdAt),
        updatedAt: toIso(material.updatedAt),
      });
      if (oldId != null) materialIdMap.set(oldId, Number(result.lastInsertRowid));
      existingMaterialCodes.set(material.codigo, Number(result.lastInsertRowid));
    }

    const insertSurvey = db.prepare(`
      INSERT INTO surveys (
        clientId, titulo, fecha, direccionObra, estado, tipoInstalacion, voltaje,
        numCircuitos, metrosCable, numContactos, numLuminarias, requiereTablero,
        capacidadInterruptorPrincipal, espaciosTablero, sistemaTierraFisica, observacionesGenerales,
        notas, partidas, areas, fotosGenerales, fotos, createdAt, updatedAt
      ) VALUES (
        @clientId, @titulo, @fecha, @direccionObra, @estado, @tipoInstalacion, @voltaje,
        @numCircuitos, @metrosCable, @numContactos, @numLuminarias, @requiereTablero,
        @capacidadInterruptorPrincipal, @espaciosTablero, @sistemaTierraFisica, @observacionesGenerales,
        @notas, @partidas, @areas, @fotosGenerales, @fotos, @createdAt, @updatedAt
      )
    `);

    for (const survey of input.surveys) {
      const oldId = survey.id;
      const mappedClientId = clientIdMap.get(survey.clientId);
      if (mappedClientId == null) continue;

      const result = insertSurvey.run({
        ...surveyToBindParams(survey),
        clientId: mappedClientId,
      });
      if (oldId != null) surveyIdMap.set(oldId, Number(result.lastInsertRowid));
    }

    const insertQuote = db.prepare(`
      INSERT INTO quotes (
        clientId, surveyId, numero, fecha, validezDias, materiales, manoObra,
        notas, ivaPorcentaje, estado, createdAt, updatedAt
      ) VALUES (
        @clientId, @surveyId, @numero, @fecha, @validezDias, @materiales, @manoObra,
        @notas, @ivaPorcentaje, @estado, @createdAt, @updatedAt
      )
    `);

    for (const quote of input.quotes) {
      const oldId = quote.id;
      const mappedClientId = clientIdMap.get(quote.clientId);
      if (mappedClientId == null) continue;

      const mappedSurveyId = quote.surveyId ? surveyIdMap.get(quote.surveyId) ?? null : null;

      const result = insertQuote.run({
        clientId: mappedClientId,
        surveyId: mappedSurveyId,
        numero: quote.numero,
        fecha: toIso(quote.fecha),
        validezDias: quote.validezDias,
        materiales: JSON.stringify(quote.materiales ?? []),
        manoObra: JSON.stringify(quote.manoObra ?? []),
        notas: quote.notas ?? null,
        ivaPorcentaje: quote.ivaPorcentaje,
        estado: quote.estado,
        createdAt: toIso(quote.createdAt),
        updatedAt: toIso(quote.updatedAt),
      });
      if (oldId != null) quoteIdMap.set(oldId, Number(result.lastInsertRowid));
    }

    const insertSheet = db.prepare(`
      INSERT INTO service_sheets (
        clientId, quoteId, numero, fecha, tipoServicio, direccionServicio, descripcionTrabajo,
        materiales, garantiaMeses, notas, fotos, tecnico, createdAt, updatedAt
      ) VALUES (
        @clientId, @quoteId, @numero, @fecha, @tipoServicio, @direccionServicio, @descripcionTrabajo,
        @materiales, @garantiaMeses, @notas, @fotos, @tecnico, @createdAt, @updatedAt
      )
    `);

    for (const sheet of input.serviceSheets) {
      const mappedClientId = clientIdMap.get(sheet.clientId);
      if (mappedClientId == null) continue;

      const mappedQuoteId = sheet.quoteId ? quoteIdMap.get(sheet.quoteId) ?? null : null;

      insertSheet.run({
        clientId: mappedClientId,
        quoteId: mappedQuoteId,
        numero: sheet.numero,
        fecha: toIso(sheet.fecha),
        tipoServicio: sheet.tipoServicio,
        direccionServicio: sheet.direccionServicio,
        descripcionTrabajo: sheet.descripcionTrabajo,
        materiales: JSON.stringify(sheet.materiales ?? []),
        garantiaMeses: sheet.garantiaMeses,
        notas: sheet.notas ?? null,
        fotos: JSON.stringify(sheet.fotos ?? []),
        tecnico: sheet.tecnico ?? null,
        createdAt: toIso(sheet.createdAt),
        updatedAt: toIso(sheet.updatedAt),
      });
    }
  });

  tx();
}

export type UpsertAction =
  | { table: "clients"; record: Client }
  | { table: "materials"; record: Material }
  | { table: "surveys"; record: Survey }
  | { table: "quotes"; record: Quote }
  | { table: "serviceSheets"; record: ServiceSheet }
  | { table: "custom_work_types"; record: CustomWorkType };

export function upsertRecord(
  action: UpsertAction,
): Client | Material | Survey | Quote | ServiceSheet | CustomWorkType {
  const db = getDb();

  if (action.table === "clients") {
    const r = action.record;
    if (r.id) {
      const params = {
        id: r.id,
        nombre: r.nombre,
        empresa: r.empresa ?? null,
        telefono: r.telefono,
        email: r.email ?? null,
        direccion: r.direccion,
        notas: r.notas ?? null,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE clients SET nombre=@nombre, empresa=@empresa, telefono=@telefono, email=@email,
            direccion=@direccion, notas=@notas, updatedAt=@updatedAt WHERE id=@id
          `).run({
            id: r.id,
            nombre: r.nombre,
            empresa: r.empresa ?? null,
            telefono: r.telefono,
            email: r.email ?? null,
            direccion: r.direccion,
            notas: r.notas ?? null,
            updatedAt: toIso(r.updatedAt),
          }),
        () =>
          db.prepare(`
            INSERT INTO clients (id, nombre, empresa, telefono, email, direccion, notas, createdAt, updatedAt)
            VALUES (@id, @nombre, @empresa, @telefono, @email, @direccion, @notas, @createdAt, @updatedAt)
          `).run(params),
      );
      return rowToClient(db.prepare("SELECT * FROM clients WHERE id = ?").get(r.id) as Record<string, unknown>);
    }

    const result = db.prepare(`
      INSERT INTO clients (nombre, empresa, telefono, email, direccion, notas, createdAt, updatedAt)
      VALUES (@nombre, @empresa, @telefono, @email, @direccion, @notas, @createdAt, @updatedAt)
    `).run({
      nombre: r.nombre,
      empresa: r.empresa ?? null,
      telefono: r.telefono,
      email: r.email ?? null,
      direccion: r.direccion,
      notas: r.notas ?? null,
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    });
    return rowToClient(
      db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>,
    );
  }

  if (action.table === "materials") {
    const r = action.record;
    if (r.id) {
      const params = {
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        unidad: r.unidad,
        precioUnitario: r.precioUnitario,
        categoria: r.categoria,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE materials SET codigo=@codigo, nombre=@nombre, unidad=@unidad, precioUnitario=@precioUnitario,
            categoria=@categoria, updatedAt=@updatedAt WHERE id=@id
          `).run({
            id: r.id,
            codigo: r.codigo,
            nombre: r.nombre,
            unidad: r.unidad,
            precioUnitario: r.precioUnitario,
            categoria: r.categoria,
            updatedAt: toIso(r.updatedAt),
          }),
        () =>
          db.prepare(`
            INSERT INTO materials (id, codigo, nombre, unidad, precioUnitario, categoria, createdAt, updatedAt)
            VALUES (@id, @codigo, @nombre, @unidad, @precioUnitario, @categoria, @createdAt, @updatedAt)
          `).run(params),
      );
      return rowToMaterial(db.prepare("SELECT * FROM materials WHERE id = ?").get(r.id) as Record<string, unknown>);
    }

    const result = db.prepare(`
      INSERT INTO materials (codigo, nombre, unidad, precioUnitario, categoria, createdAt, updatedAt)
      VALUES (@codigo, @nombre, @unidad, @precioUnitario, @categoria, @createdAt, @updatedAt)
    `).run({
      codigo: r.codigo,
      nombre: r.nombre,
      unidad: r.unidad,
      precioUnitario: r.precioUnitario,
      categoria: r.categoria,
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    });
    return rowToMaterial(
      db.prepare("SELECT * FROM materials WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>,
    );
  }

  if (action.table === "surveys") {
    const r = action.record;
    if (r.id) {
      const bind = { id: r.id, ...surveyToBindParams(r) };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE surveys SET clientId=@clientId, titulo=@titulo, fecha=@fecha, direccionObra=@direccionObra,
            estado=@estado, tipoInstalacion=@tipoInstalacion, voltaje=@voltaje, numCircuitos=@numCircuitos,
            metrosCable=@metrosCable, numContactos=@numContactos, numLuminarias=@numLuminarias,
            requiereTablero=@requiereTablero, capacidadInterruptorPrincipal=@capacidadInterruptorPrincipal,
            espaciosTablero=@espaciosTablero, sistemaTierraFisica=@sistemaTierraFisica,
            observacionesGenerales=@observacionesGenerales, notas=@notas, partidas=@partidas, areas=@areas,
            fotosGenerales=@fotosGenerales, fotos=@fotos, updatedAt=@updatedAt WHERE id=@id
          `).run(bind),
        () =>
          db.prepare(`
            INSERT INTO surveys (
              id, clientId, titulo, fecha, direccionObra, estado, tipoInstalacion, voltaje,
              numCircuitos, metrosCable, numContactos, numLuminarias, requiereTablero,
              capacidadInterruptorPrincipal, espaciosTablero, sistemaTierraFisica, observacionesGenerales,
              notas, partidas, areas, fotosGenerales, fotos, createdAt, updatedAt
            ) VALUES (
              @id, @clientId, @titulo, @fecha, @direccionObra, @estado, @tipoInstalacion, @voltaje,
              @numCircuitos, @metrosCable, @numContactos, @numLuminarias, @requiereTablero,
              @capacidadInterruptorPrincipal, @espaciosTablero, @sistemaTierraFisica, @observacionesGenerales,
              @notas, @partidas, @areas, @fotosGenerales, @fotos, @createdAt, @updatedAt
            )
          `).run(bind),
      );
      return rowToSurvey(db.prepare("SELECT * FROM surveys WHERE id = ?").get(r.id) as Record<string, unknown>);
    }

    const result = db.prepare(`
      INSERT INTO surveys (
        clientId, titulo, fecha, direccionObra, estado, tipoInstalacion, voltaje,
        numCircuitos, metrosCable, numContactos, numLuminarias, requiereTablero,
        capacidadInterruptorPrincipal, espaciosTablero, sistemaTierraFisica, observacionesGenerales,
        notas, partidas, areas, fotosGenerales, fotos, createdAt, updatedAt
      ) VALUES (
        @clientId, @titulo, @fecha, @direccionObra, @estado, @tipoInstalacion, @voltaje,
        @numCircuitos, @metrosCable, @numContactos, @numLuminarias, @requiereTablero,
        @capacidadInterruptorPrincipal, @espaciosTablero, @sistemaTierraFisica, @observacionesGenerales,
        @notas, @partidas, @areas, @fotosGenerales, @fotos, @createdAt, @updatedAt
      )
    `).run(surveyToBindParams(r));
    return rowToSurvey(
      db.prepare("SELECT * FROM surveys WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>,
    );
  }

  if (action.table === "quotes") {
    const r = action.record;
    if (r.id) {
      const params = {
        id: r.id,
        clientId: r.clientId,
        surveyId: r.surveyId ?? null,
        numero: r.numero,
        fecha: toIso(r.fecha),
        validezDias: r.validezDias,
        materiales: JSON.stringify(r.materiales ?? []),
        manoObra: JSON.stringify(r.manoObra ?? []),
        notas: r.notas ?? null,
        ivaPorcentaje: r.ivaPorcentaje,
        estado: r.estado,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE quotes SET clientId=@clientId, surveyId=@surveyId, numero=@numero, fecha=@fecha,
            validezDias=@validezDias, materiales=@materiales, manoObra=@manoObra, notas=@notas,
            ivaPorcentaje=@ivaPorcentaje, estado=@estado, updatedAt=@updatedAt WHERE id=@id
          `).run({
            id: r.id,
            clientId: r.clientId,
            surveyId: r.surveyId ?? null,
            numero: r.numero,
            fecha: toIso(r.fecha),
            validezDias: r.validezDias,
            materiales: JSON.stringify(r.materiales ?? []),
            manoObra: JSON.stringify(r.manoObra ?? []),
            notas: r.notas ?? null,
            ivaPorcentaje: r.ivaPorcentaje,
            estado: r.estado,
            updatedAt: toIso(r.updatedAt),
          }),
        () =>
          db.prepare(`
            INSERT INTO quotes (
              id, clientId, surveyId, numero, fecha, validezDias, materiales, manoObra,
              notas, ivaPorcentaje, estado, createdAt, updatedAt
            ) VALUES (
              @id, @clientId, @surveyId, @numero, @fecha, @validezDias, @materiales, @manoObra,
              @notas, @ivaPorcentaje, @estado, @createdAt, @updatedAt
            )
          `).run(params),
      );
      return rowToQuote(db.prepare("SELECT * FROM quotes WHERE id = ?").get(r.id) as Record<string, unknown>);
    }

    const result = db.prepare(`
      INSERT INTO quotes (
        clientId, surveyId, numero, fecha, validezDias, materiales, manoObra,
        notas, ivaPorcentaje, estado, createdAt, updatedAt
      ) VALUES (
        @clientId, @surveyId, @numero, @fecha, @validezDias, @materiales, @manoObra,
        @notas, @ivaPorcentaje, @estado, @createdAt, @updatedAt
      )
    `).run({
      clientId: r.clientId,
      surveyId: r.surveyId ?? null,
      numero: r.numero,
      fecha: toIso(r.fecha),
      validezDias: r.validezDias,
      materiales: JSON.stringify(r.materiales ?? []),
      manoObra: JSON.stringify(r.manoObra ?? []),
      notas: r.notas ?? null,
      ivaPorcentaje: r.ivaPorcentaje,
      estado: r.estado,
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    });
    return rowToQuote(
      db.prepare("SELECT * FROM quotes WHERE id = ?").get(result.lastInsertRowid) as Record<string, unknown>,
    );
  }

  if (action.table === "serviceSheets") {
    const r = action.record;
    if (r.id) {
      const params = {
        id: r.id,
        clientId: r.clientId,
        quoteId: r.quoteId ?? null,
        numero: r.numero,
        fecha: toIso(r.fecha),
        tipoServicio: r.tipoServicio,
        direccionServicio: r.direccionServicio,
        descripcionTrabajo: r.descripcionTrabajo,
        materiales: JSON.stringify(r.materiales ?? []),
        garantiaMeses: r.garantiaMeses,
        notas: r.notas ?? null,
        fotos: JSON.stringify(r.fotos ?? []),
        tecnico: r.tecnico ?? null,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE service_sheets SET clientId=@clientId, quoteId=@quoteId, numero=@numero, fecha=@fecha,
            tipoServicio=@tipoServicio, direccionServicio=@direccionServicio, descripcionTrabajo=@descripcionTrabajo,
            materiales=@materiales, garantiaMeses=@garantiaMeses, notas=@notas, fotos=@fotos, tecnico=@tecnico,
            updatedAt=@updatedAt WHERE id=@id
          `).run({
            id: r.id,
            clientId: r.clientId,
            quoteId: r.quoteId ?? null,
            numero: r.numero,
            fecha: toIso(r.fecha),
            tipoServicio: r.tipoServicio,
            direccionServicio: r.direccionServicio,
            descripcionTrabajo: r.descripcionTrabajo,
            materiales: JSON.stringify(r.materiales ?? []),
            garantiaMeses: r.garantiaMeses,
            notas: r.notas ?? null,
            fotos: JSON.stringify(r.fotos ?? []),
            tecnico: r.tecnico ?? null,
            updatedAt: toIso(r.updatedAt),
          }),
        () =>
          db.prepare(`
            INSERT INTO service_sheets (
              id, clientId, quoteId, numero, fecha, tipoServicio, direccionServicio, descripcionTrabajo,
              materiales, garantiaMeses, notas, fotos, tecnico, createdAt, updatedAt
            ) VALUES (
              @id, @clientId, @quoteId, @numero, @fecha, @tipoServicio, @direccionServicio, @descripcionTrabajo,
              @materiales, @garantiaMeses, @notas, @fotos, @tecnico, @createdAt, @updatedAt
            )
          `).run(params),
      );
      return rowToServiceSheet(
        db.prepare("SELECT * FROM service_sheets WHERE id = ?").get(r.id) as Record<string, unknown>,
      );
    }

    const result = db.prepare(`
      INSERT INTO service_sheets (
        clientId, quoteId, numero, fecha, tipoServicio, direccionServicio, descripcionTrabajo,
        materiales, garantiaMeses, notas, fotos, tecnico, createdAt, updatedAt
      ) VALUES (
        @clientId, @quoteId, @numero, @fecha, @tipoServicio, @direccionServicio, @descripcionTrabajo,
        @materiales, @garantiaMeses, @notas, @fotos, @tecnico, @createdAt, @updatedAt
      )
    `).run({
      clientId: r.clientId,
      quoteId: r.quoteId ?? null,
      numero: r.numero,
      fecha: toIso(r.fecha),
      tipoServicio: r.tipoServicio,
      direccionServicio: r.direccionServicio,
      descripcionTrabajo: r.descripcionTrabajo,
      materiales: JSON.stringify(r.materiales ?? []),
      garantiaMeses: r.garantiaMeses,
      notas: r.notas ?? null,
      fotos: JSON.stringify(r.fotos ?? []),
      tecnico: r.tecnico ?? null,
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    });
    return rowToServiceSheet(
      db.prepare("SELECT * FROM service_sheets WHERE id = ?").get(result.lastInsertRowid) as Record<
        string,
        unknown
      >,
    );
  }

  if (action.table === "custom_work_types") {
    const r = action.record;
    const nombre = r.nombre.trim();
    if (!nombre) throw new Error("El nombre del trabajo es requerido");

    const existingByName = db
      .prepare("SELECT * FROM custom_work_types WHERE nombre = ? COLLATE NOCASE")
      .get(nombre) as Record<string, unknown> | undefined;

    if (r.id) {
      const params = {
        id: r.id,
        nombre,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
      };
      updateOrInsertById(
        () =>
          db.prepare(`
            UPDATE custom_work_types SET nombre=@nombre, updatedAt=@updatedAt WHERE id=@id
          `).run({ id: r.id, nombre, updatedAt: toIso(r.updatedAt) }),
        () =>
          db.prepare(`
            INSERT INTO custom_work_types (id, nombre, createdAt, updatedAt)
            VALUES (@id, @nombre, @createdAt, @updatedAt)
          `).run(params),
      );
      return rowToCustomWorkType(
        db.prepare("SELECT * FROM custom_work_types WHERE id = ?").get(r.id) as Record<string, unknown>,
      );
    }

    if (existingByName) {
      db.prepare("UPDATE custom_work_types SET updatedAt = ? WHERE id = ?").run(
        toIso(r.updatedAt),
        existingByName.id,
      );
      return rowToCustomWorkType(existingByName);
    }

    const result = db.prepare(`
      INSERT INTO custom_work_types (nombre, createdAt, updatedAt)
      VALUES (@nombre, @createdAt, @updatedAt)
    `).run({
      nombre,
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    });
    return rowToCustomWorkType(
      db.prepare("SELECT * FROM custom_work_types WHERE id = ?").get(result.lastInsertRowid) as Record<
        string,
        unknown
      >,
    );
  }

  throw new Error(`Tabla no soportada: ${(action as UpsertAction).table}`);
}

export type DeleteAction =
  | { table: "clients"; id: number }
  | { table: "materials"; id: number }
  | { table: "surveys"; id: number }
  | { table: "quotes"; id: number }
  | { table: "serviceSheets"; id: number };

export function deleteRecord(action: DeleteAction) {
  const db = getDb();

  if (action.table === "clients") {
    db.prepare("DELETE FROM clients WHERE id = ?").run(action.id);
    return;
  }
  if (action.table === "materials") {
    db.prepare("DELETE FROM materials WHERE id = ?").run(action.id);
    return;
  }
  if (action.table === "surveys") {
    db.prepare("DELETE FROM surveys WHERE id = ?").run(action.id);
    return;
  }
  if (action.table === "quotes") {
    db.prepare("DELETE FROM quotes WHERE id = ?").run(action.id);
    return;
  }
  db.prepare("DELETE FROM service_sheets WHERE id = ?").run(action.id);
}

export function deleteClientCascade(id: number) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM service_sheets WHERE clientId = ?").run(id);
    db.prepare("DELETE FROM quotes WHERE clientId = ?").run(id);
    db.prepare("DELETE FROM surveys WHERE clientId = ?").run(id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  });
  tx();
}
