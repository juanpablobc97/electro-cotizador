import Dexie, { type EntityTable } from "dexie";
import type { Client, ColaboradorWithUser, Material, Quote, ServiceSheet, Survey } from "./types";

const db = new Dexie("ElectroCotizadorDB") as Dexie & {
  clients: EntityTable<Client, "id">;
  materials: EntityTable<Material, "id">;
  surveys: EntityTable<Survey, "id">;
  quotes: EntityTable<Quote, "id">;
  serviceSheets: EntityTable<ServiceSheet, "id">;
  colaboradoresCache: EntityTable<ColaboradorWithUser, "id">;
};

db.version(1).stores({
  clients: "++id, nombre, telefono, createdAt",
  materials: "++id, codigo, nombre, categoria, createdAt",
  surveys: "++id, clientId, estado, fecha, createdAt",
  quotes: "++id, clientId, surveyId, numero, estado, fecha, createdAt",
});

db.version(2).stores({
  clients: "++id, nombre, telefono, createdAt",
  materials: "++id, codigo, nombre, categoria, createdAt",
  surveys: "++id, clientId, estado, fecha, createdAt",
  quotes: "++id, clientId, surveyId, numero, estado, fecha, createdAt",
  serviceSheets: "++id, clientId, numero, fecha, tipoServicio, createdAt",
});

db.version(3).stores({
  clients: "++id, nombre, telefono, createdAt",
  materials: "++id, codigo, nombre, categoria, createdAt",
  surveys: "++id, clientId, estado, fecha, createdAt",
  quotes: "++id, clientId, surveyId, numero, estado, fecha, createdAt",
  serviceSheets: "++id, clientId, quoteId, numero, fecha, tipoServicio, createdAt",
});

db.version(4).stores({
  clients: "++id, nombre, telefono, createdAt",
  materials: "++id, codigo, nombre, categoria, createdAt",
  surveys: "++id, clientId, estado, fecha, createdAt",
  quotes: "++id, clientId, surveyId, numero, estado, fecha, createdAt",
  serviceSheets: "++id, clientId, quoteId, numero, fecha, tipoServicio, createdAt",
  colaboradoresCache: "id, nombre, activo",
});

export async function seedDefaultMaterials() {
  const count = await db.materials.count();
  if (count > 0) return;

  const now = new Date();
  await db.materials.bulkAdd([
    {
      codigo: "CAB-THW12",
      nombre: "Cable THW-2 calibre 12",
      unidad: "m",
      precioUnitario: 18.5,
      categoria: "Cableado",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "CAB-THW10",
      nombre: "Cable THW-2 calibre 10",
      unidad: "m",
      precioUnitario: 28.0,
      categoria: "Cableado",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "INT-SIMP",
      nombre: "Interruptor sencillo",
      unidad: "pza",
      precioUnitario: 45.0,
      categoria: "Apagadores",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "CONT-2P",
      nombre: "Contacto duplex polarizado",
      unidad: "pza",
      precioUnitario: 55.0,
      categoria: "Contactos",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "TBR-8C",
      nombre: "Tablero de distribución 8 circuitos",
      unidad: "pza",
      precioUnitario: 1850.0,
      categoria: "Tableros",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "TBR-12C",
      nombre: "Tablero de distribución 12 circuitos",
      unidad: "pza",
      precioUnitario: 2450.0,
      categoria: "Tableros",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "LUM-LED",
      nombre: "Luminaria LED empotrable 12W",
      unidad: "pza",
      precioUnitario: 320.0,
      categoria: "Iluminación",
      createdAt: now,
      updatedAt: now,
    },
    {
      codigo: "TB-ORG",
      nombre: "Tubería conduit 13mm (3m)",
      unidad: "pza",
      precioUnitario: 85.0,
      categoria: "Canalización",
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export { db };
