import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("proveedores") }),
  z.object({ step: z.literal("comandas"), proveedor: z.string().min(1) }),
  z.object({
    step: z.literal("lineas"),
    proveedor: z.string().min(1),
    numComanda: z.string().min(1),
  }),
]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = Object.fromEntries(sp.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    if (parsed.data.step === "proveedores") {
      const rows = await prisma.$queryRaw<{ nomProveedor: string }[]>`
        SELECT DISTINCT TRIM(nomProveedor) AS nomProveedor
        FROM comandes
        WHERE nomProveedor IS NOT NULL AND TRIM(nomProveedor) <> ''
        ORDER BY nomProveedor ASC
      `;
      return NextResponse.json({ proveedores: rows.map((r) => r.nomProveedor) });
    }

    if (parsed.data.step === "comandas") {
      const proveedor = parsed.data.proveedor;
      const rows = await prisma.$queryRaw<{ numComanda: string; total: bigint; enviadas: bigint }[]>`
        SELECT
          TRIM(c.numComanda) AS numComanda,
          CAST(COUNT(*) AS UNSIGNED) AS total,
          CAST(COALESCE(SUM(IF(e.estado IN ('ENVIADA_PROVEEDOR', 'RECIBIDA_EMPRESA'), 1, 0)), 0) AS UNSIGNED) AS enviadas
        FROM comandes c
        LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
        WHERE TRIM(c.nomProveedor) = ${proveedor}
        GROUP BY TRIM(c.numComanda)
        HAVING numComanda IS NOT NULL AND numComanda <> ''
        ORDER BY numComanda ASC
      `;
      const comandas = rows.map((r) => ({
        numComanda: r.numComanda,
        total: Number(r.total),
        enviadas: Number(r.enviadas),
      }));
      return NextResponse.json({ comandas });
    }

    const { proveedor, numComanda } = parsed.data;
    const lineas = await prisma.$queryRaw<
      {
        idComanda: number;
        numComanda: string | null;
        nomProveedor: string | null;
        reparacion: string | null;
        codiPieza: string | null;
        codigoFab: string | null;
        cantidad: number | null;
        codigoConjunto: string | null;
        OP: string | null;
        tipus: string | null;
        fechaInsercion: Date | null;
        cerrada: boolean | null;
        estadoPortal: string | null;
        enviadoAt: Date | null;
        recibidoAt: Date | null;
      }[]
    >`
      SELECT
        c.idComanda,
        c.numComanda,
        c.nomProveedor,
        c.reparacion,
        c.codiPieza,
        c.codigoFab,
        c.cantidad,
        c.codigoConjunto,
        c.OP,
        c.tipus,
        c.fechaInsercion,
        c.cerrada,
        e.estado AS estadoPortal,
        e.enviado_at AS enviadoAt,
        e.recibido_at AS recibidoAt
      FROM comandes c
      LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
      WHERE TRIM(c.nomProveedor) = ${proveedor}
        AND TRIM(c.numComanda) = ${numComanda}
      ORDER BY c.idComanda ASC
    `;

    const serializadas = lineas.map((l) => ({
      ...l,
      fechaInsercion: l.fechaInsercion ? l.fechaInsercion.toISOString() : null,
      enviadoAt: l.enviadoAt ? l.enviadoAt.toISOString() : null,
      recibidoAt: l.recibidoAt ? l.recibidoAt.toISOString() : null,
    }));

    return NextResponse.json({ lineas: serializadas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
