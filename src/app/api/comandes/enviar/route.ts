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
 * Marca líneas de `comandes` como enviadas por el proveedor.
 * PROVEEDOR: solo puede enviar líneas de su `usuario.proveedor` (ignora manipulación del body).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

  const { numComanda, idLineas } = parsed.data;
  const nomProveedorBody = parsed.data.nomProveedor.trim();

  const effectiveNom =
    user.rol === Rol.PROVEEDOR ? trimProveedor(user.proveedor) : trimProveedor(nomProveedorBody);

  if (!effectiveNom) {
    return NextResponse.json({ error: "Proveedor no válido en tu cuenta" }, { status: 403 });
  }

  if (user.rol === Rol.PROVEEDOR && nomProveedorBody !== effectiveNom) {
    return NextResponse.json({ error: "No puedes enviar en nombre de otro proveedor" }, { status: 403 });
  }

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

    const yaCerradas = await prisma.lineaComandesEstado.findMany({
      where: {
        idLineaComandes: { in: ids },
        estado: {
          in: [
            EstadoLineaComandesExt.RECIBIDA_EMPRESA,
            EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
          ],
        },
      },
      select: { idLineaComandes: true, estado: true },
    });
    const bloqueadas = new Set(yaCerradas.map((r) => r.idLineaComandes));
    /** Reenvío permitido solo si estaba rechazada o sin fila de estado. */
    const permitidas = ids.filter((id) => !bloqueadas.has(id));
    if (permitidas.length === 0) {
      const soloEnviadas = yaCerradas.every((r) => r.estado === EstadoLineaComandesExt.ENVIADA_PROVEEDOR);
      return NextResponse.json(
        {
          error: soloEnviadas
            ? "Esas líneas ya están enviadas (naranja). Esperan confirmación del administrador, o puedes quitar el envío desde el portal si aún no están confirmadas."
            : "Las líneas seleccionadas ya están recibidas en empresa o no se pueden volver a enviar así.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      permitidas.map((idLineaComandes) =>
        prisma.lineaComandesEstado.upsert({
          where: { idLineaComandes },
          create: {
            idLineaComandes,
            nomProveedor: effectiveNom,
            numComanda: numComanda.trim(),
            estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
            comentarioDeclinacion: null,
          },
          update: {
            nomProveedor: effectiveNom,
            numComanda: numComanda.trim(),
            estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
            enviadoAt: new Date(),
            comentarioDeclinacion: null,
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      mensaje: `Guardado: ${permitidas.length} línea(s) marcadas como enviadas.`,
      guardadas: permitidas,
      omitidas: Array.from(bloqueadas),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
