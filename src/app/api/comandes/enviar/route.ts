import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  nomProveedor: z.string().min(1),
  numComanda: z.string().min(1),
  idLineas: z.array(z.number().int().positive()),
});

/**
 * Recibe las líneas seleccionadas para "enviar".
 * Aquí solo validamos; más adelante puedes persistir estado o disparar un job.
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
  if (idLineas.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una línea" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mensaje: `Marcadas ${idLineas.length} línea(s) para envío (comanda ${numComanda}, proveedor ${nomProveedor}).`,
    idLineas,
  });
}
