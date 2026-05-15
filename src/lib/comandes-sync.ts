import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const TABLE_COLUMNS = [
  "numComanda",
  "reparacion",
  "nomProveedor",
  "codiPieza",
  "CodigoFab",
  "cantidad",
  "codigoConjunto",
  "OP",
  "tipus",
  "cerrada",
] as const;

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

function rowToValues(r: ComandaLineaInput): (string | number | null)[] {
  return [
    r.numComanda.trim(),
    r.reparacion ?? null,
    r.nomProveedor,
    `${r.codiPieza}`.trim(),
    Number(r.CodigoFab) || 0,
    r.cantidad ?? null,
    normKey(r.codigoConjunto),
    normKey(r.OP),
    r.tipus ?? null,
    r.cerrada ?? 0,
  ];
}

async function deleteMissingLines(
  tx: Prisma.TransactionClient,
  numComanda: string,
  rows: ComandaLineaInput[],
  keyBatchSize = 500,
) {
  const keys = rows.map((r) => [
    normKey(r.OP),
    normKey(r.codigoConjunto),
    `${r.codiPieza}`.trim(),
    Number(r.CodigoFab) || 0,
  ]);

  await tx.$executeRawUnsafe(`
    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_excel_keys (
      OP VARCHAR(255) NOT NULL,
      codigoConjunto VARCHAR(255) NOT NULL,
      codiPieza VARCHAR(255) NOT NULL,
      CodigoFab INT NOT NULL,
      PRIMARY KEY (OP, codigoConjunto, codiPieza, CodigoFab)
    ) ENGINE=MEMORY
  `);
  await tx.$executeRawUnsafe(`TRUNCATE TABLE tmp_excel_keys`);

  for (let i = 0; i < keys.length; i += keyBatchSize) {
    const chunk = keys.slice(i, i + keyBatchSize);
    const placeholders = chunk.map(() => "(?,?,?,?)").join(",");
    const flat = chunk.flat();
    await tx.$executeRawUnsafe(
      `INSERT IGNORE INTO tmp_excel_keys (OP, codigoConjunto, codiPieza, CodigoFab) VALUES ${placeholders}`,
      ...flat,
    );
  }

  await tx.$executeRawUnsafe(
    `
    DELETE c
    FROM comandes c
    LEFT JOIN tmp_excel_keys t
      ON t.OP = c.OP
     AND t.codigoConjunto = c.codigoConjunto
     AND t.codiPieza = c.codiPieza
     AND t.CodigoFab = c.CodigoFab
    WHERE c.numComanda = ?
      AND t.codiPieza IS NULL
    `,
    numComanda,
  );
}

/** Misma lógica que el importador Excel: UPSERT por lote + borrar líneas que ya no están en el Excel. */
export async function syncComandaFromExcel(
  numComanda: string,
  rows: ComandaLineaInput[],
  syncDelete = true,
  batchSize = 500,
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

  const cols = TABLE_COLUMNS.map((c) => `\`${c}\``).join(",");
  const ph = `(${TABLE_COLUMNS.map(() => "?").join(",")})`;
  const sqlTail = `
    ON DUPLICATE KEY UPDATE
      cantidad = VALUES(cantidad),
      nomProveedor = VALUES(nomProveedor),
      tipus = VALUES(tipus),
      reparacion = VALUES(reparacion),
      CodigoFab = VALUES(CodigoFab),
      cerrada = VALUES(cerrada)
  `;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < normalized.length; i += batchSize) {
      const chunk = normalized.slice(i, i + batchSize);
      const values = chunk.flatMap((r) => rowToValues(r));
      const sql = `INSERT INTO comandes (${cols}) VALUES ${chunk.map(() => ph).join(",")} ${sqlTail}`;
      await tx.$executeRawUnsafe(sql, ...values);
    }

    if (syncDelete) {
      await deleteMissingLines(tx, num, normalized);
    }
  });

  return { numComanda: num, lineas: normalized.length, syncDelete };
}
