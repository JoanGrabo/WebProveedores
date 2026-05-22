import { NextRequest, NextResponse } from "next/server";
import { Prisma, Rol, TipoIncidencia } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resumenIncidenciasPorProveedor } from "@/lib/incidencias";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
  proveedor: z.string().max(255).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

function parseDateStart(s: string): Date | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateEnd(s: string): Date | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function rangoFechas(parsed: z.infer<typeof querySchema>): { desde: Date; hasta: Date; anio: number } {
  const now = new Date();
  const anio = parsed.anio ?? now.getFullYear();

  if (parsed.desde && parsed.hasta) {
    const desde = parseDateStart(parsed.desde);
    const hasta = parseDateEnd(parsed.hasta);
    if (desde && hasta && desde <= hasta) {
      return { desde, hasta, anio };
    }
  }

  const desde = new Date(anio, 0, 1, 0, 0, 0, 0);
  const hasta = new Date(anio, 11, 31, 23, 59, 59, 999);
  return { desde, hasta, anio };
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { desde, hasta, anio } = rangoFechas(parsed.data);
  const proveedorFiltro = parsed.data.proveedor?.trim() || undefined;

  try {
    const where: Prisma.IncidenciaWhereInput = {
      createdAt: { gte: desde, lte: hasta },
      ...(proveedorFiltro ? { nomProveedor: proveedorFiltro } : {}),
    };

    const [incidencias, resumenProveedores, proveedoresDistinct] = await Promise.all([
      prisma.incidencia.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { nomProveedor: "asc" }],
      }),
      resumenIncidenciasPorProveedor(prisma, desde, hasta, proveedorFiltro),
      prisma.incidencia.findMany({
        where: { createdAt: { gte: desde, lte: hasta } },
        distinct: ["nomProveedor"],
        select: { nomProveedor: true },
        orderBy: { nomProveedor: "asc" },
      }),
    ]);

    const lotesUnicos = new Set(incidencias.map((i) => i.loteId)).size;

    return NextResponse.json({
      anio,
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      totales: {
        incidencias: lotesUnicos,
        lineas: incidencias.length,
        proveedoresConIncidencias: resumenProveedores.length,
      },
      resumenProveedores,
      proveedores: proveedoresDistinct.map((p) => p.nomProveedor),
      incidencias: incidencias.map((i) => ({
        id: i.id,
        loteId: i.loteId,
        tipo: i.tipo,
        tipoLabel: i.tipo === TipoIncidencia.DECLINACION_RECEPCION ? "Declinación de recepción" : i.tipo,
        nomProveedor: i.nomProveedor,
        numComanda: i.numComanda,
        idLineaComandes: i.idLineaComandes,
        codiPieza: i.codiPieza,
        codigoFab: i.codigoFab,
        codigoConjunto: i.codigoConjunto,
        OP: i.OP,
        cantidad: i.cantidad,
        comentario: i.comentario,
        registradoPorNombre: i.registradoPorNombre,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al cargar incidencias";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
