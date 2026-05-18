/** Vista agrupada para el portal: misma pieza + OP, cantidades sumadas (conjunto oculto al proveedor). */

export type LineaComandaRaw = {
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
  fechaInsercion: string | null;
  cerrada: boolean | null;
  estadoPortal: string | null;
  enviadoAt: string | null;
  recibidoAt: string | null;
};

export type EstadoGrupo =
  | null
  | "ENVIADA_PROVEEDOR"
  | "RECIBIDA_EMPRESA"
  | "RECHAZADA_EMPRESA"
  | "PARCIAL";

export type LineaAgrupada = {
  grupoKey: string;
  numComanda: string | null;
  nomProveedor: string | null;
  reparacion: string | null;
  codiPieza: string | null;
  codigoFab: string | null;
  cantidadTotal: number;
  /** Unidades de entradas asignadas por FIFO a las líneas de este grupo (misma pieza en la comanda). */
  unidadesEntradasAsignadasGrupo?: number;
  OP: string | null;
  tipus: string | null;
  fechaInsercion: string | null;
  cerrada: boolean | null;
  /** Estado del grupo: solo completo si todas las filas físicas coinciden. */
  estadoPortal: EstadoGrupo;
  idComandas: number[];
  filas: number;
};

export function norm(s: string | null | undefined): string {
  return s == null ? "" : `${s}`.trim();
}

export function grupoKeyFromParts(op: string | null | undefined, codiPieza: string | null | undefined): string {
  return `${norm(op)}|${norm(codiPieza)}`;
}

/** Estado agregado: el proveedor “termina” el grupo cuando las N filas (conjuntos) van al unísono. */
export function estadoPortalGrupo(estados: (string | null)[]): EstadoGrupo {
  if (estados.length === 0) return null;
  const n = estados.length;
  const recibidas = estados.filter((e) => e === "RECIBIDA_EMPRESA").length;
  const enviadas = estados.filter((e) => e === "ENVIADA_PROVEEDOR").length;
  const rechazadas = estados.filter((e) => e === "RECHAZADA_EMPRESA").length;
  const pendientes = estados.filter((e) => e == null).length;

  if (recibidas === n) return "RECIBIDA_EMPRESA";
  if (enviadas === n) return "ENVIADA_PROVEEDOR";
  if (rechazadas === n) return "RECHAZADA_EMPRESA";
  if (pendientes === n) return null;
  return "PARCIAL";
}

export function agruparLineasComanda(lineas: LineaComandaRaw[]): LineaAgrupada[] {
  const map = new Map<string, LineaAgrupada & { _estados: (string | null)[] }>();

  for (const l of lineas) {
    const key = grupoKeyFromParts(l.OP, l.codiPieza);
    let g = map.get(key);
    if (!g) {
      g = {
        grupoKey: key,
        numComanda: l.numComanda,
        nomProveedor: l.nomProveedor,
        reparacion: l.reparacion,
        codiPieza: l.codiPieza,
        codigoFab: l.codigoFab,
        cantidadTotal: 0,
        OP: l.OP,
        tipus: l.tipus,
        fechaInsercion: l.fechaInsercion,
        cerrada: l.cerrada,
        estadoPortal: null,
        idComandas: [],
        filas: 0,
        _estados: [],
      };
      map.set(key, g);
    }
    g.cantidadTotal += Number(l.cantidad) || 0;
    g.idComandas.push(l.idComanda);
    g._estados.push(l.estadoPortal);
    g.filas += 1;
    if (l.fechaInsercion && (!g.fechaInsercion || l.fechaInsercion < g.fechaInsercion)) {
      g.fechaInsercion = l.fechaInsercion;
    }
    if (l.tipus && !g.tipus) g.tipus = l.tipus;
    if (l.reparacion && !g.reparacion) g.reparacion = l.reparacion;
  }

  const out = Array.from(map.values()).map(({ _estados, ...g }) => ({
    ...g,
    estadoPortal: estadoPortalGrupo(_estados),
  }));

  out.sort((a, b) => {
    const op = norm(a.OP).localeCompare(norm(b.OP), undefined, { numeric: true });
    if (op !== 0) return op;
    return norm(a.codiPieza).localeCompare(norm(b.codiPieza), undefined, { numeric: true });
  });

  return out;
}

/** Grupo contado como enviado/recibido en progreso de comanda (todas las filas físicas). */
export function grupoCompletadoParaProgreso(estado: EstadoGrupo): boolean {
  return estado === "ENVIADA_PROVEEDOR" || estado === "RECIBIDA_EMPRESA";
}

export function resumenGruposPorComanda(
  lineas: { numComanda: string; OP: string | null; codiPieza: string | null; estadoPortal: string | null }[],
): Map<string, { total: number; enviadas: number }> {
  const porComanda = new Map<string, Map<string, (string | null)[]>>();

  for (const l of lineas) {
    const num = l.numComanda.trim();
    const gk = grupoKeyFromParts(l.OP, l.codiPieza);
    let grupos = porComanda.get(num);
    if (!grupos) {
      grupos = new Map();
      porComanda.set(num, grupos);
    }
    const arr = grupos.get(gk) ?? [];
    arr.push(l.estadoPortal);
    grupos.set(gk, arr);
  }

  const res = new Map<string, { total: number; enviadas: number }>();
  for (const [num, grupos] of Array.from(porComanda.entries())) {
    let total = 0;
    let enviadas = 0;
    for (const estados of Array.from(grupos.values())) {
      total++;
      if (grupoCompletadoParaProgreso(estadoPortalGrupo(estados))) enviadas++;
    }
    res.set(num, { total, enviadas });
  }
  return res;
}

export type ResumenProveedorComanda = {
  nomProveedor: string;
  numComanda: string;
  total: number;
  enviadas: number;
};

/** Progreso agrupado por proveedor + comanda (tabla «Todas las comandas» admin). */
export function resumenGruposPorProveedorComanda(
  lineas: {
    nomProveedor: string;
    numComanda: string;
    OP: string | null;
    codiPieza: string | null;
    estadoPortal: string | null;
  }[],
): ResumenProveedorComanda[] {
  const porComanda = new Map<string, Map<string, (string | null)[]>>();

  for (const l of lineas) {
    const prov = l.nomProveedor.trim();
    const num = l.numComanda.trim();
    if (!prov || !num) continue;
    const pk = `${prov}|${num}`;
    const gk = grupoKeyFromParts(l.OP, l.codiPieza);
    let grupos = porComanda.get(pk);
    if (!grupos) {
      grupos = new Map();
      porComanda.set(pk, grupos);
    }
    const arr = grupos.get(gk) ?? [];
    arr.push(l.estadoPortal);
    grupos.set(gk, arr);
  }

  const out: ResumenProveedorComanda[] = [];
  for (const [pk, grupos] of Array.from(porComanda.entries())) {
    const sep = pk.indexOf("|");
    const nomProveedor = pk.slice(0, sep);
    const numComanda = pk.slice(sep + 1);
    let total = 0;
    let enviadas = 0;
    for (const estados of Array.from(grupos.values())) {
      total++;
      if (grupoCompletadoParaProgreso(estadoPortalGrupo(estados))) enviadas++;
    }
    out.push({ nomProveedor, numComanda, total, enviadas });
  }

  out.sort((a, b) => {
    const p = a.nomProveedor.localeCompare(b.nomProveedor, undefined, { sensitivity: "base" });
    if (p !== 0) return p;
    return a.numComanda.localeCompare(b.numComanda, undefined, { numeric: true, sensitivity: "base" });
  });

  return out;
}

export type ComandaIncompletaProveedorResumen = {
  numComanda: string;
  total: number;
  confirmadas: number;
  enviadas: number;
  porHacer: number;
};

/**
 * Dashboard proveedor «pendientes de cerrar»: contadores por grupo OP+pieza.
 * La comanda sale de la lista cuando todos los grupos están en verde (RECIBIDA).
 */
export function comandasIncompletasProveedorAgrupadas(
  lineas: { numComanda: string; OP: string | null; codiPieza: string | null; estadoPortal: string | null }[],
): ComandaIncompletaProveedorResumen[] {
  const porComanda = new Map<string, Map<string, (string | null)[]>>();

  for (const l of lineas) {
    const num = l.numComanda.trim();
    if (!num) continue;
    const gk = grupoKeyFromParts(l.OP, l.codiPieza);
    let grupos = porComanda.get(num);
    if (!grupos) {
      grupos = new Map();
      porComanda.set(num, grupos);
    }
    const arr = grupos.get(gk) ?? [];
    arr.push(l.estadoPortal);
    grupos.set(gk, arr);
  }

  const out: ComandaIncompletaProveedorResumen[] = [];
  for (const [numComanda, grupos] of Array.from(porComanda.entries())) {
    let total = 0;
    let confirmadas = 0;
    let enviadas = 0;
    let porHacer = 0;

    for (const estados of Array.from(grupos.values())) {
      total++;
      const estado = estadoPortalGrupo(estados);
      if (estado === "RECIBIDA_EMPRESA") confirmadas++;
      else if (estado === "ENVIADA_PROVEEDOR") enviadas++;
      else porHacer++;
    }

    if (confirmadas < total) {
      out.push({ numComanda, total, confirmadas, enviadas, porHacer });
    }
  }

  out.sort((a, b) =>
    a.numComanda.localeCompare(b.numComanda, undefined, { numeric: true, sensitivity: "base" }),
  );
  return out;
}
