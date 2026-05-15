import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const str45 = z.string().trim().min(1, "Obligatorio").max(45);

export const entradaCreateSchema = z.object({
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

export async function createEntradaFromJson(json: unknown) {
  const parsed = entradaCreateSchema.safeParse(json);
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
