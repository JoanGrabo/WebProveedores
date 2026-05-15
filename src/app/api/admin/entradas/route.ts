import { NextRequest, NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const str45 = z.string().trim().min(1, "Obligatorio").max(45);

const createSchema = z.object({
  codigoPieza: str45,
  unidadesPieza: str45,
  numeroAlbaran: str45,
  fechaEntrada: z.string().min(1, "Indica fecha y hora"),
  proveedor: str45,
  numeroComanda: str45,
});

function parseFechaEntrada(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los campos (máx. 45 caracteres por texto)" }, { status: 400 });
  }

  const fecha = parseFechaEntrada(parsed.data.fechaEntrada);
  if (!fecha) {
    return NextResponse.json({ error: "Fecha de entrada no válida" }, { status: 400 });
  }

  try {
    const e = await prisma.entrada.create({
      data: {
        codigoPieza: parsed.data.codigoPieza,
        unidadesPieza: parsed.data.unidadesPieza,
        numeroAlbaran: parsed.data.numeroAlbaran,
        fechaEntrada: fecha,
        proveedor: parsed.data.proveedor,
        numeroComanda: parsed.data.numeroComanda,
      },
    });
    return NextResponse.json({
      entrada: {
        idEntrada: e.idEntrada,
        codigoPieza: e.codigoPieza,
        unidadesPieza: e.unidadesPieza,
        numeroAlbaran: e.numeroAlbaran,
        fechaEntrada: e.fechaEntrada.toISOString(),
        proveedor: e.proveedor,
        numeroComanda: e.numeroComanda,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al registrar la entrada";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
