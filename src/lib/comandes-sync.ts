import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DATA_COLUMNS = [
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

function lineKey(r: Pick<ComandaLineaInput, "OP" | "codigoConjunto" | "codiPieza" | "CodigoFab">): string {
  return `${normKey(r.OP)}|${normKey(r.codigoConjunto)}|${`${r.codiPieza}`.trim()}|${Number(r.CodigoFab) || 0}`;
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

async function upsertLinesWithExplicitId(
  tx: Prisma.TransactionClient,
  num: string,
  normalized: ComandaLineaInput[],
) {
  const existing = await tx.$queryRaw<
    { idComanda: bigint; OP: string | null; codigoConjunto: string | null; codiPieza: string | null; CodigoFab: number | null }[]
  >`
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

  const dataCols = DATA_COLUMNS.map((c) => `\`${c}\``).join(",");

  for (const r of normalized) {
    const values = rowToValues(r);
    const k = lineKey(r);
    const existingId = idByKey.get(k);

    if (existingId != null) {
      await tx.$executeRawUnsafe(
        `UPDATE comandes SET ${DATA_COLUMNS.map((c) => `\`${c}\` = ?`).join(", ")} WHERE idComanda = ?`,
        ...values,
        existingId,
      );
    } else {
      const id = nextId++;
      await tx.$executeRawUnsafe(
        `INSERT INTO comandes (idComanda, ${dataCols}) VALUES (?, ${DATA_COLUMNS.map(() => "?").join(",")})`,
        id,
        ...values,
      );
      idByKey.set(k, id);
    }
  }
}

/**
 * Sincroniza una comanda (líneas desde Excel).
 * Asigna idComanda manualmente si la tabla no tiene AUTO_INCREMENT (común en VPS).
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

  await prisma.$transaction(async (tx) => {
    await upsertLinesWithExplicitId(tx, num, normalized);
    if (syncDelete) {
      await deleteMissingLines(tx, num, normalized);
    }
  });

  return { numComanda: num, lineas: normalized.length, syncDelete };
}
