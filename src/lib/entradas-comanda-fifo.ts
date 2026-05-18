import type { Prisma, PrismaClient } from "@prisma/client";
import { EstadoLineaComandesExt } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FifoLineaResumen = {
  idComanda: number;
  pedido: number;
  asignadoFifo: number;
  recibida: boolean;
};

export type FifoRecepcionResultado = {
  proveedor: string;
  numComanda: string;
  codigoPieza: string;
  unidadesEntradas: number;
  unidadesPedido: number;
  lineas: FifoLineaResumen[];
  lineasMarcadasRecibidas: number;
  lineasRevertidasDeRecibida: number;
};

function parseUnidadesEntrada(s: string | null | undefined): number {
  if (s == null) return 0;
  const t = `${s}`.trim().replace(",", ".");
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type DistribucionFifoEntradas = {
  unidadesEntradas: number;
  unidadesPedido: number;
  lineas: FifoLineaResumen[];
};

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Solo lectura: reparto FIFO entradas → líneas `comandes` (misma pieza, proveedor, comanda).
 */
export async function calcularDistribucionFifoEntradas(
  db: Db,
  proveedor: string,
  numComanda: string,
  codigoPieza: string,
): Promise<DistribucionFifoEntradas> {
  const prov = proveedor.trim();
  const num = numComanda.trim();
  const pieza = codigoPieza.trim();

  const entradas = await db.$queryRaw<{ idEntrada: number; unidadesPieza: string; fechaEntrada: Date }[]>`
    SELECT idEntrada, unidadesPieza, fechaEntrada
    FROM entradas
    WHERE TRIM(Proveedor) = ${prov}
      AND TRIM(numeroComanda) = ${num}
      AND TRIM(codigoPieza) = ${pieza}
    ORDER BY fechaEntrada ASC, idEntrada ASC
  `;

  const unidadesEntradas = entradas.reduce((s, e) => s + parseUnidadesEntrada(e.unidadesPieza), 0);

  const lineasCom = await db.$queryRaw<
    { idComanda: number; cantidad: number | null; nomProveedor: string | null; numComanda: string | null }[]
  >`
    SELECT idComanda, cantidad, nomProveedor, numComanda
    FROM comandes
    WHERE TRIM(nomProveedor) = ${prov}
      AND TRIM(numComanda) = ${num}
      AND TRIM(codiPieza) = ${pieza}
    ORDER BY idComanda ASC
  `;

  let remaining = unidadesEntradas;
  const resumenLineas: FifoLineaResumen[] = [];
  let unidadesPedido = 0;

  for (const row of lineasCom) {
    const pedido = Math.max(0, Number(row.cantidad) || 0);
    unidadesPedido += pedido;
    const asignadoFifo = pedido === 0 ? 0 : Math.min(remaining, pedido);
    if (pedido > 0) {
      remaining -= asignadoFifo;
    }
    const recibida = pedido > 0 && asignadoFifo >= pedido;
    resumenLineas.push({
      idComanda: row.idComanda,
      pedido,
      asignadoFifo,
      recibida,
    });
  }

  return { unidadesEntradas, unidadesPedido, lineas: resumenLineas };
}

type Tx = Prisma.TransactionClient;

/**
 * Reparte unidades de todas las entradas (misma pieza + proveedor + comanda) en orden
 * fechaEntrada, idEntrada sobre líneas de `comandes` ordenadas por idComanda (FIFO).
 * Marca RECIBIDA_EMPRESA cuando asignado >= pedido; si ya no alcanza, pasa RECIBIDA → ENVIADA.
 */
export async function aplicarFifoEntradasAcomandes(
  tx: Tx,
  proveedor: string,
  numComanda: string,
  codigoPieza: string,
): Promise<FifoRecepcionResultado> {
  const prov = proveedor.trim();
  const num = numComanda.trim();
  const pieza = codigoPieza.trim();

  const { unidadesEntradas, unidadesPedido, lineas: resumenLineas } = await calcularDistribucionFifoEntradas(
    tx,
    prov,
    num,
    pieza,
  );

  let lineasMarcadasRecibidas = 0;
  let lineasRevertidasDeRecibida = 0;

  for (const L of resumenLineas) {
    if (L.pedido <= 0) continue;

    const nomP = prov;
    const numC = num;

    const existing = await tx.lineaComandesEstado.findUnique({
      where: { idLineaComandes: L.idComanda },
      select: { estado: true },
    });

    if (L.recibida) {
      await tx.lineaComandesEstado.upsert({
        where: { idLineaComandes: L.idComanda },
        create: {
          idLineaComandes: L.idComanda,
          nomProveedor: nomP,
          numComanda: numC,
          estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
          recibidoAt: new Date(),
          comentarioDeclinacion: null,
        },
        update: {
          estado: EstadoLineaComandesExt.RECIBIDA_EMPRESA,
          recibidoAt: new Date(),
          nomProveedor: nomP,
          numComanda: numC,
          comentarioDeclinacion: null,
        },
      });
      if (existing?.estado !== EstadoLineaComandesExt.RECIBIDA_EMPRESA) {
        lineasMarcadasRecibidas++;
      }
      continue;
    }

    if (existing?.estado === EstadoLineaComandesExt.RECIBIDA_EMPRESA) {
      await tx.lineaComandesEstado.update({
        where: { idLineaComandes: L.idComanda },
        data: {
          estado: EstadoLineaComandesExt.ENVIADA_PROVEEDOR,
          recibidoAt: null,
          nomProveedor: nomP,
          numComanda: numC,
          comentarioDeclinacion: null,
        },
      });
      lineasRevertidasDeRecibida++;
    }
  }

  return {
    proveedor: prov,
    numComanda: num,
    codigoPieza: pieza,
    unidadesEntradas,
    unidadesPedido,
    lineas: resumenLineas,
    lineasMarcadasRecibidas,
    lineasRevertidasDeRecibida,
  };
}

export type FifoComandaSyncResumen = {
  piezasProcesadas: number;
  lineasMarcadasRecibidas: number;
  lineasRevertidasDeRecibida: number;
};

/**
 * Aplica FIFO para todas las piezas de una comanda (líneas en `comandes` y/o `entradas`).
 * Útil tras cargar la comanda cuando las entradas ya existían, o al abrir la comanda en el portal.
 */
export async function aplicarFifoTodasPiezasComanda(
  proveedor: string,
  numComanda: string,
): Promise<FifoComandaSyncResumen> {
  const prov = proveedor.trim();
  const num = numComanda.trim();
  if (!prov || !num) {
    return { piezasProcesadas: 0, lineasMarcadasRecibidas: 0, lineasRevertidasDeRecibida: 0 };
  }

  const [piezasComandes, piezasEntradas] = await Promise.all([
    prisma.$queryRaw<{ pieza: string | null }[]>`
      SELECT DISTINCT TRIM(codiPieza) AS pieza
      FROM comandes
      WHERE TRIM(nomProveedor) = ${prov}
        AND TRIM(numComanda) = ${num}
        AND TRIM(codiPieza) <> ''
    `,
    prisma.$queryRaw<{ pieza: string | null }[]>`
      SELECT DISTINCT TRIM(codigoPieza) AS pieza
      FROM entradas
      WHERE TRIM(Proveedor) = ${prov}
        AND TRIM(numeroComanda) = ${num}
        AND TRIM(codigoPieza) <> ''
    `,
  ]);

  const piezasUnicas: string[] = [];
  const visto = new Set<string>();
  for (const row of [...piezasComandes, ...piezasEntradas]) {
    const pieza = row.pieza?.trim();
    if (!pieza || visto.has(pieza)) continue;
    visto.add(pieza);
    piezasUnicas.push(pieza);
  }

  let lineasMarcadasRecibidas = 0;
  let lineasRevertidasDeRecibida = 0;

  await prisma.$transaction(async (tx) => {
    for (const pieza of piezasUnicas) {
      const r = await aplicarFifoEntradasAcomandes(tx, prov, num, pieza);
      lineasMarcadasRecibidas += r.lineasMarcadasRecibidas;
      lineasRevertidasDeRecibida += r.lineasRevertidasDeRecibida;
    }
  });

  return {
    piezasProcesadas: piezasUnicas.length,
    lineasMarcadasRecibidas,
    lineasRevertidasDeRecibida,
  };
}
