import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { EstadoLineaComandesExt, Rol } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  idLineas: z.array(z.number().int().positive()),
});

/**
 * Panel empresa: marca líneas como recibidas.
 * Solo ADMIN (también validado en middleware).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.rol !== Rol.ADMIN) {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.idLineas.length === 0) {
    return NextResponse.json({ error: "Indica idLineas" }, { status: 400 });
  }

  const ids = Array.from(new Set(parsed.data.idLineas));

  try {
    const res = await prisma.lineaComandesEstado.updateMany({
      where: {
        idLineaComandes: { in: ids },
        estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
      },
      data: {
        estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
        recibidoAt: new Date(),
      },
    });
    return NextResponse.json({
      ok: true,
      mensaje: `Actualizadas ${res.count} línea(s) a recibidas en empresa.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
