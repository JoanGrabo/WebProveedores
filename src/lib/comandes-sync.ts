import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Incrementa al cambiar la lógica de sync (comprueba despliegue con GET /api/mobile/comandas/sync). */
export const COMANDA_SYNC_VERSION = 4;

export const comandaLineaSchema = z.object({
  numComanda: z.string().min(1).max(255),
  reparacion: z.string().max(500).nullable().optional(),
  nomProveedor: z.string().min(1).max(255),
  codiPieza: z.string().min(1).max(255),
  CodigoFab: z.coerce.number().int().nonnegative().default(0),
  cantidad: z.coerce.number().int().nullable().optional(),
  codigoConjunto: z.string().max(255).optional().default(""),
  OP: z.string().max(255).optional().default(""),
  tipus: z.string().max(255).nullable().optional(),
  cerrada: z.coerce.number().int().min(0).max(1).optional().default(0),
});

export const comandaSyncBodySchema = z.object({
  numComanda: z.string().min(1).max(255),
  rows: z.array(comandaLineaSchema).min(1).max(5000),
  syncDelete: z.boolean().optional().default(true),
});

export type ComandaLineaInput = z.infer<typeof comandaLineaSchema>;

function normKey(v: string | null | undefined): string {
  return v == null ? "" : `${v}`.trim();
}

function lineKey(r: Pick<ComandaLineaInput, "OP" | "codigoConjunto" | "codiPieza" | "CodigoFab">): string {
  return `${normKey(r.OP)}|${normKey(r.codigoConjunto)}|${`${r.codiPieza}`.trim()}|${Number(r.CodigoFab) || 0}`;
}

type ExistingLine = {
  idComanda: bigint;
  OP: string | null;
  codigoConjunto: string | null;
  codiPieza: string | null;
  CodigoFab: number | null;
};

/** Borra líneas de la comanda que ya no están en el Excel (sin tabla temporal; menos permisos MySQL). */
async function deleteMissingLines(
  tx: Prisma.TransactionClient,
  numComanda: string,
  rows: ComandaLineaInput[],
) {
  if (rows.length === 0) {
    await tx.$executeRaw`DELETE FROM comandes WHERE numComanda = ${numComanda}`;
    return;
  }

  const inList = Prisma.join(
    rows.map(
      (r) =>
        Prisma.sql`(${normKey(r.OP)}, ${normKey(r.codigoConjunto)}, ${`${r.codiPieza}`.trim()}, ${Number(r.CodigoFab) || 0})`,
    ),
  );

  await tx.$executeRaw`
    DELETE FROM comandes
    WHERE numComanda = ${numComanda}
      AND (OP, codigoConjunto, codiPieza, CodigoFab) NOT IN (${inList})
  `;
}

async function upsertLinesWithExplicitId(
  tx: Prisma.TransactionClient,
  num: string,
  normalized: ComandaLineaInput[],
) {
  const existing = await tx.$queryRaw<ExistingLine[]>`
    SELECT idComanda, OP, codigoConjunto, codiPieza, CodigoFab
    FROM comandes
    WHERE numComanda = ${num}
  `;

  const idByKey = new Map<string, number>();
  for (const e of existing) {
    idByKey.set(
      lineKey({
        OP: e.OP ?? "",
        codigoConjunto: e.codigoConjunto ?? "",
        codiPieza: e.codiPieza ?? "",
        CodigoFab: Number(e.CodigoFab) || 0,
      }),
      Number(e.idComanda),
    );
  }

  const maxRow = await tx.$queryRaw<{ m: bigint | null }[]>`SELECT MAX(idComanda) AS m FROM comandes`;
  let nextId = Number(maxRow[0]?.m ?? 0) + 1;

  let inserted = 0;
  let updated = 0;

  for (const r of normalized) {
    const k = lineKey(r);
    const existingId = idByKey.get(k);
    const codiPieza = `${r.codiPieza}`.trim();
    const codigoFab = Number(r.CodigoFab) || 0;
    const op = normKey(r.OP);
    const codigoConjunto = normKey(r.codigoConjunto);
    const cantidad = r.cantidad ?? null;
    const cerrada = r.cerrada ?? 0;

    if (existingId != null) {
      await tx.$executeRaw`
        UPDATE comandes SET
          numComanda = ${num},
          reparacion = ${r.reparacion ?? null},
          nomProveedor = ${r.nomProveedor},
          codiPieza = ${codiPieza},
          CodigoFab = ${codigoFab},
          cantidad = ${cantidad},
          codigoConjunto = ${codigoConjunto},
          OP = ${op},
          tipus = ${r.tipus ?? null},
          cerrada = ${cerrada}
        WHERE idComanda = ${existingId}
      `;
      updated++;
    } else {
      const id = nextId++;
      await tx.$executeRaw`
        INSERT INTO comandes (
          idComanda,
          numComanda,
          reparacion,
          nomProveedor,
          codiPieza,
          CodigoFab,
          cantidad,
          codigoConjunto,
          OP,
          tipus,
          cerrada
        ) VALUES (
          ${id},
          ${num},
          ${r.reparacion ?? null},
          ${r.nomProveedor},
          ${codiPieza},
          ${codigoFab},
          ${cantidad},
          ${codigoConjunto},
          ${op},
          ${r.tipus ?? null},
          ${cerrada}
        )
      `;
      idByKey.set(k, id);
      inserted++;
    }
  }

  return { inserted, updated, nextIdStart: nextId };
}

/**
 * Sincroniza una comanda (líneas desde Excel).
 * Siempre asigna idComanda en INSERT (tablas sin AUTO_INCREMENT en VPS).
 */
export async function syncComandaFromExcel(
  numComanda: string,
  rows: ComandaLineaInput[],
  syncDelete = true,
) {
  const num = numComanda.trim();
  const normalized = rows.map((r) => ({
    ...r,
    numComanda: num,
    codiPieza: `${r.codiPieza}`.trim(),
    CodigoFab: Number(r.CodigoFab) || 0,
    codigoConjunto: normKey(r.codigoConjunto),
    OP: normKey(r.OP),
    cerrada: r.cerrada ?? 0,
  }));

  for (const r of normalized) {
    if (r.numComanda !== num) {
      throw new Error("Todas las filas deben pertenecer a la misma numComanda");
    }
  }

  const stats = await prisma.$transaction(async (tx) => {
    const upsertStats = await upsertLinesWithExplicitId(tx, num, normalized);
    if (syncDelete) {
      await deleteMissingLines(tx, num, normalized);
    }
    return upsertStats;
  });

  return {
    syncVersion: COMANDA_SYNC_VERSION,
    numComanda: num,
    lineas: normalized.length,
    syncDelete,
    inserted: stats.inserted,
    updated: stats.updated,
  };
}
