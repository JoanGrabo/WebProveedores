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
      const rows = await prisma.$queryRaw<{ numComanda: string }[]>`
        SELECT DISTINCT TRIM(numComanda) AS numComanda
        FROM comandes
        WHERE TRIM(nomProveedor) = ${proveedor}
          AND numComanda IS NOT NULL AND TRIM(numComanda) <> ''
        ORDER BY numComanda ASC
      `;
      return NextResponse.json({ numComandas: rows.map((r) => r.numComanda) });
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
      }[]
    >`
      SELECT idComanda, numComanda, nomProveedor, reparacion, codiPieza, codigoFab, cantidad,
             codigoConjunto, OP, tipus, fechaInsercion, cerrada
      FROM comandes
      WHERE TRIM(nomProveedor) = ${proveedor}
        AND TRIM(numComanda) = ${numComanda}
      ORDER BY idComanda ASC
    `;
    return NextResponse.json({ lineas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
