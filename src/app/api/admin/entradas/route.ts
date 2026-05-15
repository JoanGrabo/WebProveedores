import { NextRequest, NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { createEntradaFromJson } from "@/lib/entradas-create";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const entradas = await prisma.entrada.findMany({
    orderBy: { fechaEntrada: "desc" },
  });
  return NextResponse.json({
    entradas: entradas.map((e) => ({
      idEntrada: e.idEntrada,
      codigoPieza: e.codigoPieza,
      unidadesPieza: e.unidadesPieza,
      numeroAlbaran: e.numeroAlbaran,
      fechaEntrada: e.fechaEntrada.toISOString(),
      proveedor: e.proveedor,
      numeroComanda: e.numeroComanda,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  return createEntradaFromJson(json);
}
