import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { EstadoLineaComandesExt, Rol } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nomProveedor: z.string().min(1),
  numComanda: z.string().min(1),
  idLineas: z.array(z.number().int().positive()),
});

function trimProveedor(p: string | null | undefined): string | null {
  if (p == null) return null;
  const t = p.trim();
  return t.length ? t : null;
}

/**
 * Quita el marcado «enviado» (naranja) mientras ningún admin haya confirmado recepción (verde).
 * Solo PROVEEDOR; borra la fila en `lineas_comandes_estado` solo si estado = ENVIADA_PROVEEDOR.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (user.rol !== Rol.PROVEEDOR) {
    return NextResponse.json({ error: "Solo los proveedores pueden quitar el envío no confirmado" }, { status: 403 });
  }

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

  const effectiveNom = trimProveedor(user.proveedor);
  if (!effectiveNom) {
    return NextResponse.json({ error: "Proveedor no válido en tu cuenta" }, { status: 403 });
  }

  const nomProveedorBody = parsed.data.nomProveedor.trim();
  if (nomProveedorBody !== effectiveNom) {
    return NextResponse.json({ error: "No puedes modificar líneas de otro proveedor" }, { status: 403 });
  }

  const { numComanda, idLineas } = parsed.data;
  const ids = Array.from(new Set(idLineas));
  if (ids.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una línea" }, { status: 400 });
  }

  try {
    const allLineas = await prisma.$queryRaw<{ idComanda: number }[]>`
      SELECT idComanda
      FROM comandes
      WHERE TRIM(nomProveedor) = ${effectiveNom}
        AND TRIM(numComanda) = ${numComanda.trim()}
    `;
    const validSet = new Set(allLineas.map((r) => r.idComanda));
    const invalid = ids.filter((id) => !validSet.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Alguna línea no pertenece a este proveedor y comanda.", invalid },
        { status: 400 },
      );
    }

    const res = await prisma.lineaComandesEstado.deleteMany({
      where: {
        idLineaComandes: { in: ids },
        estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
      },
    });

    if (res.count === 0) {
      return NextResponse.json(
        {
          error:
            "Ninguna línea seleccionada estaba en «enviada» sin confirmar. Solo puedes quitar el envío de líneas naranjas que aún no haya aceptado un administrador.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Listo: se quitó el envío de ${res.count} línea(s). Vuelven a estar pendientes.`,
      quitadas: res.count,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
