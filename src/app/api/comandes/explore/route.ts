import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  agruparLineasComanda,
  comandasIncompletasProveedorAgrupadas,
  norm,
  resumenGruposPorComanda,
  resumenGruposPorProveedorComanda,
} from "@/lib/comandes-lineas-agrupadas";
import { calcularDistribucionFifoEntradas } from "@/lib/entradas-comanda-fifo";
import { Rol } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("proveedores") }),
  z.object({ step: z.literal("comandas-globales") }),
  z.object({ step: z.literal("pendientes-recepcion-admin") }),
  z.object({ step: z.literal("comandas-incompletas-proveedor") }),
  z.object({ step: z.literal("comandas"), proveedor: z.string().min(1) }),
  z.object({
    step: z.literal("lineas"),
    proveedor: z.string().min(1),
    numComanda: z.string().min(1),
  }),
]);

function trimProveedor(p: string | null | undefined): string | null {
  if (p == null) return null;
  const t = p.trim();
  return t.length ? t : null;
}

/** Algunos drivers devuelven TEXT como Buffer en `$queryRaw`. */
function strFromDb(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(v)) return v.toString("utf8");
  return String(v);
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const raw = Object.fromEntries(sp.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  try {
    if (parsed.data.step === "proveedores") {
      if (user.rol !== Rol.ADMIN) {
        return NextResponse.json({ error: "Solo administradores pueden listar todos los proveedores" }, { status: 403 });
      }
      const rows = await prisma.$queryRaw<{ nomProveedor: string }[]>`
        SELECT DISTINCT TRIM(nomProveedor) AS nomProveedor
        FROM comandes
        WHERE nomProveedor IS NOT NULL AND TRIM(nomProveedor) <> ''
        ORDER BY nomProveedor ASC
      `;
      return NextResponse.json({ proveedores: rows.map((r) => r.nomProveedor) });
    }

    if (parsed.data.step === "comandas-globales") {
      if (user.rol !== Rol.ADMIN) {
        return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
      }
      const filas = await prisma.$queryRaw<
        {
          nomProveedor: string;
          numComanda: string;
          OP: string | null;
          codiPieza: string | null;
          estadoPortal: string | null;
        }[]
      >`
        SELECT
          TRIM(c.nomProveedor) AS nomProveedor,
          TRIM(c.numComanda) AS numComanda,
          c.OP,
          c.codiPieza,
          e.estado AS estadoPortal
        FROM comandes c
        LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
        WHERE c.nomProveedor IS NOT NULL AND TRIM(c.nomProveedor) <> ''
          AND c.numComanda IS NOT NULL AND TRIM(c.numComanda) <> ''
      `;
      const comandas = resumenGruposPorProveedorComanda(filas);
      return NextResponse.json({ comandas, agrupado: true });
    }

    if (parsed.data.step === "pendientes-recepcion-admin") {
      if (user.rol !== Rol.ADMIN) {
        return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
      }
      const rows = await prisma.$queryRaw<
        { nomProveedor: string; numComanda: string; lineasPendientes: bigint }[]
      >`
        SELECT
          TRIM(c.nomProveedor) AS nomProveedor,
          TRIM(c.numComanda) AS numComanda,
          CAST(COUNT(*) AS UNSIGNED) AS lineasPendientes
        FROM comandes c
        INNER JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
          AND e.estado = 'ENVIADA_PROVEEDOR'
        WHERE c.nomProveedor IS NOT NULL AND TRIM(c.nomProveedor) <> ''
          AND c.numComanda IS NOT NULL AND TRIM(c.numComanda) <> ''
        GROUP BY TRIM(c.nomProveedor), TRIM(c.numComanda)
        ORDER BY nomProveedor ASC, numComanda ASC
      `;
      const comandas = rows.map((r) => ({
        nomProveedor: r.nomProveedor,
        numComanda: r.numComanda,
        lineasPendientes: Number(r.lineasPendientes),
      }));
      return NextResponse.json({ comandas });
    }

    if (parsed.data.step === "comandas-incompletas-proveedor") {
      if (user.rol !== Rol.PROVEEDOR) {
        return NextResponse.json({ error: "Solo proveedores" }, { status: 403 });
      }
      const effective = trimProveedor(user.proveedor);
      if (!effective) {
        return NextResponse.json(
          { error: "Tu usuario no tiene proveedor asignado. Contacta con administración." },
          { status: 403 },
        );
      }
      const filas = await prisma.$queryRaw<
        { numComanda: string; OP: string | null; codiPieza: string | null; estadoPortal: string | null }[]
      >`
        SELECT
          TRIM(c.numComanda) AS numComanda,
          c.OP,
          c.codiPieza,
          e.estado AS estadoPortal
        FROM comandes c
        LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
        WHERE TRIM(c.nomProveedor) = ${effective}
          AND c.numComanda IS NOT NULL AND TRIM(c.numComanda) <> ''
      `;
      const comandas = comandasIncompletasProveedorAgrupadas(filas);
      return NextResponse.json({ comandas, agrupado: true });
    }

    if (parsed.data.step === "comandas") {
      const effective =
        user.rol === Rol.PROVEEDOR
          ? trimProveedor(user.proveedor)
          : trimProveedor(parsed.data.proveedor);
      if (!effective) {
        return NextResponse.json(
          { error: "Tu usuario no tiene proveedor asignado. Contacta con administración." },
          { status: 403 },
        );
      }
      if (user.rol === Rol.PROVEEDOR && trimProveedor(parsed.data.proveedor) !== effective) {
        return NextResponse.json({ error: "No autorizado para ese proveedor" }, { status: 403 });
      }

      const filas = await prisma.$queryRaw<
        { numComanda: string; OP: string | null; codiPieza: string | null; estadoPortal: string | null }[]
      >`
        SELECT
          TRIM(c.numComanda) AS numComanda,
          c.OP,
          c.codiPieza,
          e.estado AS estadoPortal
        FROM comandes c
        LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
        WHERE TRIM(c.nomProveedor) = ${effective}
          AND c.numComanda IS NOT NULL AND TRIM(c.numComanda) <> ''
      `;
      const resumen = resumenGruposPorComanda(filas);
      const comandas = Array.from(resumen.entries())
        .map(([numComanda, { total, enviadas }]) => ({ numComanda, total, enviadas }))
        .sort((a, b) => a.numComanda.localeCompare(b.numComanda, undefined, { numeric: true }));
      return NextResponse.json({ comandas });
    }

    const numComanda = parsed.data.numComanda.trim();
    const effectiveProv =
      user.rol === Rol.PROVEEDOR
        ? trimProveedor(user.proveedor)
        : trimProveedor(parsed.data.proveedor);
    if (!effectiveProv) {
      return NextResponse.json({ error: "Proveedor no válido" }, { status: 403 });
    }
    if (user.rol === Rol.PROVEEDOR && trimProveedor(parsed.data.proveedor) !== effectiveProv) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const lineas = await prisma.$queryRaw<
      {
        idComanda: number;
        numComanda: string | null;
        nomProveedor: string | null;
        reparacion: string | null;
        codiPieza: string | null;
        codigoFab: string | null;
        cantidad: number | null;
        codigoConjunto: string | null;
        OP: string | null;
        tipus: string | null;
        fechaInsercion: Date | null;
        cerrada: boolean | null;
        estadoPortal: string | null;
        enviadoAt: Date | null;
        recibidoAt: Date | null;
        comentarioDeclinacion: string | null;
      }[]
    >`
      SELECT
        c.idComanda,
        c.numComanda,
        c.nomProveedor,
        c.reparacion,
        c.codiPieza,
        c.codigoFab,
        c.cantidad,
        c.codigoConjunto,
        c.OP,
        c.tipus,
        c.fechaInsercion,
        c.cerrada,
        e.estado AS estadoPortal,
        e.enviado_at AS enviadoAt,
        e.recibido_at AS recibidoAt,
        e.comentario_declinacion AS comentarioDeclinacion
      FROM comandes c
      LEFT JOIN lineas_comandes_estado e ON e.id_linea_comandes = c.idComanda
      WHERE TRIM(c.nomProveedor) = ${effectiveProv}
        AND TRIM(c.numComanda) = ${numComanda}
      ORDER BY c.idComanda ASC
    `;

    const serializadas = lineas.map((l) => ({
      ...l,
      comentarioDeclinacion: strFromDb(l.comentarioDeclinacion),
      fechaInsercion: l.fechaInsercion ? l.fechaInsercion.toISOString() : null,
      enviadoAt: l.enviadoAt ? l.enviadoAt.toISOString() : null,
      recibidoAt: l.recibidoAt ? l.recibidoAt.toISOString() : null,
    }));

    const agrupadas = agruparLineasComanda(serializadas);

    const piezasClave = new Set<string>();
    for (const g of agrupadas) {
      const p = norm(g.codiPieza);
      if (p) piezasClave.add(p);
    }

    const asignadoPorId = new Map<number, number>();
    for (const pieza of Array.from(piezasClave)) {
      const dist = await calcularDistribucionFifoEntradas(prisma, effectiveProv, numComanda, pieza);
      for (const L of dist.lineas) {
        asignadoPorId.set(L.idComanda, L.asignadoFifo);
      }
    }

    const agrupadasConFifo = agrupadas.map((g) => {
      let unidadesEntradasAsignadasGrupo = 0;
      for (const id of g.idComandas) {
        unidadesEntradasAsignadasGrupo += asignadoPorId.get(id) ?? 0;
      }
      return { ...g, unidadesEntradasAsignadasGrupo };
    });

    return NextResponse.json({ lineas: agrupadasConFifo, agrupado: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
