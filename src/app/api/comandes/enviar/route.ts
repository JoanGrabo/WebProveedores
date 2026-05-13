import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EstadoLineaComandesExt } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nomProveedor: z.string().min(1),
  numComanda: z.string().min(1),
  idLineas: z.array(z.number().int().positive()),
});

/**
 * Marca líneas de `comandes` como enviadas por el proveedor.
 * Persiste en `lineas_comandes_estado` (no modifica la tabla `comandes`).
 */
export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { nomProveedor, numComanda, idLineas } = parsed.data;
  const ids = Array.from(new Set(idLineas));
  if (ids.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una línea" }, { status: 400 });
  }

  try {
    const allLineas = await prisma.$queryRaw<{ idComanda: number }[]>`
      SELECT idComanda
      FROM comandes
      WHERE TRIM(nomProveedor) = ${nomProveedor}
        AND TRIM(numComanda) = ${numComanda}
    `;
    const validSet = new Set(allLineas.map((r) => r.idComanda));
    const invalid = ids.filter((id) => !validSet.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Alguna línea no pertenece a este proveedor y comanda.", invalid },
        { status: 400 },
      );
    }

    const yaRecibidas = await prisma.lineaComandesEstado.findMany({
      where: {
        idLineaComandes: { in: ids },
        estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
      },
      select: { idLineaComandes: true },
    });
    const bloqueadas = new Set(yaRecibidas.map((r) => r.idLineaComandes));
    const permitidas = ids.filter((id) => !bloqueadas.has(id));
    if (permitidas.length === 0) {
      return NextResponse.json(
        { error: "Las líneas seleccionadas ya están marcadas como recibidas en empresa." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      permitidas.map((idLineaComandes) =>
        prisma.lineaComandesEstado.upsert({
          where: { idLineaComandes },
          create: {
            idLineaComandes,
            nomProveedor,
            numComanda,
            estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
          },
          update: {
            nomProveedor,
            numComanda,
            estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
            enviadoAt: new Date(),
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      mensaje: `Guardado: ${permitidas.length} línea(s) marcadas como enviadas.`,
      guardadas: permitidas,
      omitidasPorRecibidas: Array.from(bloqueadas),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
