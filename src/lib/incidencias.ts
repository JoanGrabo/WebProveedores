import { Prisma, TipoIncidencia } from "@prisma/client";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

export type LineaComandesParaIncidencia = {
  idComanda: number;
  nomProveedor: string;
  numComanda: string;
  codiPieza: string | null;
  codigoFab: string | null;
  codigoConjunto: string | null;
  OP: string | null;
  cantidad: number | null;
};

/**
 * Guarda en `incidencias` un registro por línea declinada (mismo `loteId` por acción).
 * Los datos de pieza/comanda quedan congelados para informes anuales aunque luego cambie el estado.
 */
export async function registrarIncidenciasDeclinacion(
  db: Db,
  params: {
    lineas: LineaComandesParaIncidencia[];
    comentario: string;
    registradoPorId: string;
    registradoPorNombre: string;
  },
): Promise<{ loteId: string; creadas: number }> {
  const { lineas, comentario, registradoPorId, registradoPorNombre } = params;
  if (lineas.length === 0) return { loteId: "", creadas: 0 };

  const loteId = randomUUID();
  const texto = comentario.trim();

  await db.incidencia.createMany({
    data: lineas.map((r) => ({
      loteId,
      tipo: TipoIncidencia.DECLINACION_RECEPCION,
      nomProveedor: r.nomProveedor.trim(),
      numComanda: r.numComanda.trim(),
      idLineaComandes: r.idComanda,
      codiPieza: r.codiPieza?.trim() || null,
      codigoFab: r.codigoFab?.trim() || null,
      codigoConjunto: r.codigoConjunto?.trim() || null,
      OP: r.OP?.trim() || null,
      cantidad: r.cantidad != null ? Math.max(0, Number(r.cantidad) || 0) : null,
      comentario: texto,
      registradoPorId,
      registradoPorNombre: registradoPorNombre.trim() || "Administrador",
    })),
  });

  return { loteId, creadas: lineas.length };
}

export type ResumenIncidenciasProveedor = {
  nomProveedor: string;
  /** Acciones de declinación (lotes distintos) */
  incidencias: number;
  /** Líneas físicas registradas */
  lineas: number;
};

/** Totales por proveedor en un intervalo de fechas (para informe anual). */
export async function resumenIncidenciasPorProveedor(
  db: Db,
  desde: Date,
  hasta: Date,
  nomProveedor?: string,
): Promise<ResumenIncidenciasProveedor[]> {
  const where: Prisma.IncidenciaWhereInput = {
    createdAt: { gte: desde, lte: hasta },
    ...(nomProveedor ? { nomProveedor: nomProveedor.trim() } : {}),
  };

  const rows = await db.incidencia.groupBy({
    by: ["nomProveedor", "loteId"],
    where,
    _count: { id: true },
  });

  const map = new Map<string, { incidencias: number; lineas: number }>();
  for (const r of rows) {
    const prov = r.nomProveedor;
    const entry = map.get(prov) ?? { incidencias: 0, lineas: 0 };
    entry.incidencias += 1;
    entry.lineas += r._count.id;
    map.set(prov, entry);
  }

  const out: ResumenIncidenciasProveedor[] = [];
  for (const [nomProveedorKey, v] of Array.from(map.entries())) {
    out.push({
      nomProveedor: nomProveedorKey,
      incidencias: v.incidencias,
      lineas: v.lineas,
    });
  }

  out.sort((a, b) => a.nomProveedor.localeCompare(b.nomProveedor, undefined, { sensitivity: "base" }));
  return out;
}
