import { NextRequest, NextResponse } from "next/server";
import { Prisma, EstadoLineaComandesExt, Rol } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { registrarIncidenciasDeclinacion } from "@/lib/incidencias";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    idLineas: z.array(z.number().int().positive()),
    /** Sin campo: mismo comportamiento histórico (aceptar recepción). */
    accion: z.enum(["aceptar", "rechazar"]).optional().default("aceptar"),
    /** Obligatorio si accion es rechazar (visible al proveedor). */
    comentarioDeclinacion: z.string().max(8000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accion === "rechazar") {
      const c = (data.comentarioDeclinacion ?? "").trim();
      if (c.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indica un comentario de al menos 5 caracteres (motivo de la declinación).",
          path: ["comentarioDeclinacion"],
        });
      }
    }
  });

/**
 * Panel empresa (solo ADMIN):
 * - aceptar: marca líneas como recibidas en empresa. Puede ser aunque el proveedor no haya
 *   pulsado «enviado» (crea/actualiza fila en RECIBIDA).
 * - rechazar: cualquier línea de comandes → RECHAZADA_EMPRESA (también pendientes sin envío previo).
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
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const msg =
      fe.comentarioDeclinacion?.[0] ??
      fe.idLineas?.[0] ??
      fe.accion?.[0] ??
      "Datos inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  if (parsed.data.idLineas.length === 0) {
    return NextResponse.json({ error: "Indica al menos una línea en idLineas" }, { status: 400 });
  }

  const ids = Array.from(new Set(parsed.data.idLineas));
  const accion = parsed.data.accion;
  const comentarioDeclinacion = (parsed.data.comentarioDeclinacion ?? "").trim();

  try {
    if (accion === "aceptar") {
      const rows = await prisma.$queryRaw<
        { idComanda: number; nomProveedor: string; numComanda: string }[]
      >`
        SELECT
          c.idComanda AS idComanda,
          TRIM(c.nomProveedor) AS nomProveedor,
          TRIM(c.numComanda) AS numComanda
        FROM comandes c
        WHERE c.idComanda IN (${Prisma.join(ids)})
      `;
      const found = new Set(rows.map((r) => r.idComanda));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "Algún id de línea no existe en la tabla comandes.", missing },
          { status: 400 },
        );
      }

      await prisma.$transaction(
        rows.map((r) =>
          prisma.lineaComandesEstado.upsert({
            where: { idLineaComandes: r.idComanda },
            create: {
              idLineaComandes: r.idComanda,
              nomProveedor: r.nomProveedor,
              numComanda: r.numComanda,
              estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
              recibidoAt: new Date(),
              comentarioDeclinacion: null,
            },
            update: {
              estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
              recibidoAt: new Date(),
              nomProveedor: r.nomProveedor,
              numComanda: r.numComanda,
              comentarioDeclinacion: null,
            },
          }),
        ),
      );

      return NextResponse.json({
        ok: true,
        mensaje: `Recepción confirmada: ${rows.length} línea(s) marcadas como recibidas en empresa.`,
        actualizadas: rows.length,
      });
    }

    const rows = await prisma.$queryRaw<
      {
        idComanda: number;
        nomProveedor: string;
        numComanda: string;
        codiPieza: string | null;
        codigoFab: string | null;
        codigoConjunto: string | null;
        OP: string | null;
        cantidad: number | null;
      }[]
    >`
      SELECT
        c.idComanda AS idComanda,
        TRIM(c.nomProveedor) AS nomProveedor,
        TRIM(c.numComanda) AS numComanda,
        c.codiPieza,
        c.codigoFab,
        c.codigoConjunto,
        c.OP,
        c.cantidad
      FROM comandes c
      WHERE c.idComanda IN (${Prisma.join(ids)})
    `;
    const found = new Set(rows.map((r) => r.idComanda));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Algún id de línea no existe en la tabla comandes.", missing },
        { status: 400 },
      );
    }

    const { loteId, creadas: incidenciasGuardadas } = await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.lineaComandesEstado.upsert({
          where: { idLineaComandes: r.idComanda },
          create: {
            idLineaComandes: r.idComanda,
            nomProveedor: r.nomProveedor,
            numComanda: r.numComanda,
            estado: EstadoLineaComandesExt.RECHAZADA_EMPRESA,
            recibidoAt: null,
            comentarioDeclinacion,
          },
          update: {
            estado: EstadoLineaComandesExt.RECHAZADA_EMPRESA,
            recibidoAt: null,
            nomProveedor: r.nomProveedor,
            numComanda: r.numComanda,
            comentarioDeclinacion,
          },
        });
      }
      return registrarIncidenciasDeclinacion(tx, {
        lineas: rows.map((r) => ({
          idComanda: r.idComanda,
          nomProveedor: r.nomProveedor,
          numComanda: r.numComanda,
          codiPieza: r.codiPieza,
          codigoFab: r.codigoFab,
          codigoConjunto: r.codigoConjunto,
          OP: r.OP,
          cantidad: r.cantidad,
        })),
        comentario: comentarioDeclinacion,
        registradoPorId: user.id,
        registradoPorNombre: user.nombre,
      });
    });

    return NextResponse.json({
      ok: true,
      mensaje: `Declinadas ${rows.length} línea(s). El proveedor verá el motivo indicado hasta que se confirme recepción. Incidencia registrada en el historial.`,
      actualizadas: rows.length,
      incidenciasGuardadas,
      loteId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
