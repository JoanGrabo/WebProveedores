"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ComandasGlobalesDataTable } from "@/components/datatables/ComandasGlobalesDataTable";
import {
  grupoCompletadoParaProgreso,
  type EstadoGrupo,
  type LineaAgrupada,
} from "@/lib/comandes-lineas-agrupadas";

type ComandaResumen = {
  numComanda: string;
  total: number;
  enviadas: number;
};

type ComandaGlobal = {
  nomProveedor: string;
  numComanda: string;
  total: number;
  enviadas: number;
};

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

function grupoSeleccionado(g: LineaAgrupada, seleccion: Set<number>): boolean {
  return g.idComandas.length > 0 && g.idComandas.every((id) => seleccion.has(id));
}

/** Estilo de tarjeta de línea agrupada según estado y selección. */
function cardTone(l: LineaAgrupada, seleccionado: boolean): string {
  if (l.estadoPortal === "PARCIAL") {
    const base = "border-l-[6px] border-amber-500 bg-amber-50/90 shadow-sm";
    if (seleccionado) return `${base} ring-2 ring-amber-400 ring-offset-1`;
    return base;
  }
  if (l.estadoPortal === "RECIBIDA_EMPRESA") {
    const base = "border-l-[6px] border-emerald-500 bg-emerald-50/95 shadow-sm";
    if (seleccionado) return `${base} ring-2 ring-emerald-400 ring-offset-1`;
    return base;
  }
  if (l.estadoPortal === "RECHAZADA_EMPRESA") {
    const base = "border-l-[6px] border-rose-500 bg-rose-50/95 shadow-sm";
    if (seleccionado) return `${base} ring-2 ring-rose-400 ring-offset-1`;
    return base;
  }
  if (l.estadoPortal === "ENVIADA_PROVEEDOR") {
    const base = "border-l-[6px] border-orange-400 bg-orange-50 shadow-sm";
    if (seleccionado) return `${base} ring-2 ring-orange-400 ring-offset-1`;
    return base;
  }
  if (seleccionado) {
    return "border border-orange-300 bg-orange-50/90 ring-2 ring-orange-200 shadow-sm";
  }
  return "border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:bg-zinc-50/80";
}

function etiquetaEstadoGrupo(estado: EstadoGrupo): string {
  if (estado === "RECIBIDA_EMPRESA") return "Recibida";
  if (estado === "ENVIADA_PROVEEDOR") return "Enviada (pendiente revisión)";
  if (estado === "RECHAZADA_EMPRESA") return "Declinada";
  if (estado === "PARCIAL") return "Parcial (completa el grupo)";
  return "Pendiente";
}

function badgeEstadoGrupo(estado: EstadoGrupo): string {
  if (estado === "RECIBIDA_EMPRESA") return "bg-emerald-100 text-emerald-800";
  if (estado === "ENVIADA_PROVEEDOR") return "bg-orange-100 text-orange-900";
  if (estado === "RECHAZADA_EMPRESA") return "bg-rose-100 text-rose-900";
  if (estado === "PARCIAL") return "bg-amber-100 text-amber-950";
  return "bg-zinc-100 text-zinc-600";
}

function selectClass(disabled: boolean) {
  return [
    "mt-1.5 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition",
    disabled
      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
      : "border-zinc-300 bg-white text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25",
  ].join(" ");
}

function esComandaCompleta(c: ComandaResumen): boolean {
  return c.total > 0 && c.enviadas >= c.total;
}

/** Fondo en `<option>` (soporte variable entre navegadores). */
function comandaOptionStyle(c: ComandaResumen): CSSProperties {
  const { total, enviadas } = c;
  if (total <= 0) {
    return { backgroundColor: "#fafafa", color: "#3f3f46" };
  }
  if (enviadas >= total) {
    return { backgroundColor: "#dcfce7", color: "#14532d" };
  }
  if (enviadas === 0) {
    return { backgroundColor: "#ffffff", color: "#52525b" };
  }
  return { backgroundColor: "#fef9c3", color: "#713f12" };
}

function ordenComandasParaSelect(a: ComandaResumen, b: ComandaResumen): number {
  const ca = esComandaCompleta(a);
  const cb = esComandaCompleta(b);
  if (ca !== cb) return ca ? 1 : -1;
  if (!ca) {
    if (a.enviadas !== b.enviadas) return a.enviadas - b.enviadas;
    return a.numComanda.localeCompare(b.numComanda, undefined, { numeric: true, sensitivity: "base" });
  }
  return a.numComanda.localeCompare(b.numComanda, undefined, { numeric: true, sensitivity: "base" });
}

function LineasLeyenda({ rol }: { rol: "ADMIN" | "PROVEEDOR" }) {
  const prov = rol === "PROVEEDOR";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Leyenda de líneas</p>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">
          <span className="h-2 w-2 rounded-full bg-white ring-1 ring-zinc-300" />
          Pendiente
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-950">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Parcial (faltan conjuntos por enviar o confirmar)
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-900">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          {prov ? "Enviada (esperando confirmación)" : "Grupo enviado (proveedor)"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-900">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          {prov
            ? "Declinada: revisa el aviso bajo la referencia y vuelve a enviar"
            : "Declinada por empresa (el proveedor puede reenviar)"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          {prov ? "Confirmada en empresa" : "Línea recibida (empresa)"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-900">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {prov ? "Comanda completa" : "Comanda completa (todas las líneas enviadas o recibidas)"}
        </span>
      </div>
    </div>
  );
}

type ComandasExplorerProps = {
  initialProveedor?: string;
  initialComanda?: string;
};

export function ComandasExplorer(props: ComandasExplorerProps = {}) {
  const { initialProveedor, initialComanda } = props;
  const [me, setMe] = useState<Me | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [bootErr, setBootErr] = useState<string | null>(null);

  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [errProv, setErrProv] = useState<string | null>(null);

  const [proveedorSel, setProveedorSel] = useState<string | null>(null);
  const [comandas, setComandas] = useState<ComandaResumen[]>([]);
  const [loadingCom, setLoadingCom] = useState(false);
  const [errCom, setErrCom] = useState<string | null>(null);

  const [numSel, setNumSel] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaAgrupada[]>([]);
  const [loadingLin, setLoadingLin] = useState(false);
  const [errLin, setErrLin] = useState<string | null>(null);

  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set());
  const [enviando, setEnviando] = useState(false);
  const [desmarcando, setDesmarcando] = useState(false);
  const [msgEnvio, setMsgEnvio] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [msgRevision, setMsgRevision] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);
  const [modalDeclinar, setModalDeclinar] = useState(false);
  const [comentarioDeclinar, setComentarioDeclinar] = useState("");
  const [errModalDeclinar, setErrModalDeclinar] = useState<string | null>(null);

  const [comandasGlobales, setComandasGlobales] = useState<ComandaGlobal[]>([]);
  const [loadingGlob, setLoadingGlob] = useState(false);
  const [errGlob, setErrGlob] = useState<string | null>(null);

  const comandasOrdenSelect = useMemo(
    () => [...comandas].sort(ordenComandasParaSelect),
    [comandas],
  );

  useEffect(() => {
    setModalDeclinar(false);
    setComentarioDeclinar("");
    setErrModalDeclinar(null);
  }, [proveedorSel, numSel]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setBootErr(null);
      try {
        const r = await fetch("/api/auth/me");
        if (r.status === 401) {
          window.location.href = "/login?from=" + encodeURIComponent("/comandas");
          return;
        }
        const user = (await r.json()) as Me;
        if (cancel) return;
        setMe(user);

        if (user.rol === "PROVEEDOR") {
          const p = user.proveedor?.trim();
          if (!p) {
            setBootErr("Tu cuenta no tiene el nombre de proveedor asignado. Contacta con administración.");
            setProveedores([]);
            setLoadingProv(false);
            return;
          }
          setProveedorSel(p);
          setProveedores([]);
          setLoadingProv(false);
          setLoadingCom(true);
          setErrCom(null);
          try {
            const rc = await fetch(`/api/comandes/explore?${qs({ step: "comandas", proveedor: p })}`);
            const jc = await rc.json();
            if (!rc.ok) throw new Error(jc.error ?? "Error al cargar comandas");
            setComandas(Array.isArray(jc.comandas) ? jc.comandas : []);
          } catch (e) {
            setErrCom(e instanceof Error ? e.message : "Error");
            setComandas([]);
          } finally {
            setLoadingCom(false);
          }
        } else {
          setLoadingProv(true);
          setErrProv(null);
          try {
            const r2 = await fetch(`/api/comandes/explore?step=proveedores`);
            const j2 = await r2.json();
            if (!r2.ok) throw new Error(j2.error ?? "Error al cargar proveedores");
            setProveedores(j2.proveedores ?? []);
          } catch (e) {
            setErrProv(e instanceof Error ? e.message : "Error");
            setProveedores([]);
          } finally {
            setLoadingProv(false);
          }
        }
      } catch {
        if (!cancel) setBootErr("No se pudo verificar la sesión.");
      } finally {
        if (!cancel) setSessionReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!me || me.rol !== "ADMIN") return;
    let cancel = false;
    (async () => {
      setLoadingGlob(true);
      setErrGlob(null);
      try {
        const r = await fetch(`/api/comandes/explore?${qs({ step: "comandas-globales" })}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error al cargar listado global");
        if (!cancel) setComandasGlobales(Array.isArray(j.comandas) ? j.comandas : []);
      } catch (e) {
        if (!cancel) {
          setErrGlob(e instanceof Error ? e.message : "Error");
          setComandasGlobales([]);
        }
      } finally {
        if (!cancel) setLoadingGlob(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [me]);

  const fetchResumenComandas = useCallback(async (nom: string) => {
    const r = await fetch(`/api/comandes/explore?${qs({ step: "comandas", proveedor: nom })}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Error al cargar comandas");
    const raw = j.comandas as ComandaResumen[] | undefined;
    setComandas(Array.isArray(raw) ? raw : []);
  }, []);

  const cargarComandas = useCallback(
    async (nom: string) => {
      setProveedorSel(nom);
      setNumSel(null);
      setLineas([]);
      setSeleccion(new Set());
      setMsgEnvio(null);
      setMsgRevision(null);
      setLoadingCom(true);
      setErrCom(null);
      try {
        await fetchResumenComandas(nom);
      } catch (e) {
        setErrCom(e instanceof Error ? e.message : "Error");
        setComandas([]);
      } finally {
        setLoadingCom(false);
      }
    },
    [fetchResumenComandas],
  );

  const cargarLineas = useCallback(async (nom: string, num: string) => {
    setNumSel(num);
    setSeleccion(new Set());
    setMsgEnvio(null);
    setMsgRevision(null);
    setLoadingLin(true);
    setErrLin(null);
    try {
      const r = await fetch(
        `/api/comandes/explore?${qs({ step: "lineas", proveedor: nom, numComanda: num })}`,
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al cargar líneas");
      const raw = (j.lineas ?? []) as LineaAgrupada[];
      setLineas(raw);
    } catch (e) {
      setErrLin(e instanceof Error ? e.message : "Error");
      setLineas([]);
    } finally {
      setLoadingLin(false);
    }
  }, []);

  const deepLinkAplicado = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionReady || !me) return;
    const n0 = initialComanda?.trim();
    if (!n0) return;

    if (me.rol === "ADMIN") {
      const p0 = initialProveedor?.trim();
      if (!p0) return;
      const key = `a:${p0}|${n0}`;
      if (deepLinkAplicado.current === key) return;
      deepLinkAplicado.current = key;
      void (async () => {
        await cargarComandas(p0);
        await cargarLineas(p0, n0);
      })();
      return;
    }

    if (me.rol === "PROVEEDOR") {
      const p = me.proveedor?.trim();
      if (!p) return;
      const pUrl = initialProveedor?.trim();
      if (pUrl && pUrl !== p) return;
      const key = `p:${p}|${n0}`;
      if (deepLinkAplicado.current === key) return;
      deepLinkAplicado.current = key;
      void cargarLineas(p, n0);
    }
  }, [sessionReady, me, initialProveedor, initialComanda, cargarComandas, cargarLineas]);

  const puedeSeleccionarGrupo = useCallback(
    (g: LineaAgrupada) => {
      if (!me) return false;
      if (me.rol === "ADMIN") return true;
      if (g.estadoPortal === "RECIBIDA_EMPRESA") return false;
      return (
        g.estadoPortal == null ||
        g.estadoPortal === "RECHAZADA_EMPRESA" ||
        g.estadoPortal === "ENVIADA_PROVEEDOR" ||
        g.estadoPortal === "PARCIAL"
      );
    },
    [me],
  );

  const toggleGrupo = useCallback(
    (g: LineaAgrupada) => {
      if (!puedeSeleccionarGrupo(g)) return;
      setSeleccion((prev) => {
        const n = new Set(prev);
        const activo = grupoSeleccionado(g, prev);
        for (const id of g.idComandas) {
          if (activo) n.delete(id);
          else n.add(id);
        }
        return n;
      });
      setMsgEnvio(null);
      setMsgRevision(null);
    },
    [puedeSeleccionarGrupo],
  );

  const gruposSeleccionados = useMemo(
    () => lineas.filter((g) => grupoSeleccionado(g, seleccion)),
    [lineas, seleccion],
  );

  const numSeleccionados = gruposSeleccionados.length;

  const idLineasEnviadasSeleccionadas = useMemo(() => {
    return gruposSeleccionados
      .filter((g) => g.estadoPortal === "ENVIADA_PROVEEDOR")
      .flatMap((g) => g.idComandas);
  }, [gruposSeleccionados]);

  const numPendientesORechazoSeleccion = useMemo(() => {
    return gruposSeleccionados.filter(
      (g) =>
        g.estadoPortal == null ||
        g.estadoPortal === "RECHAZADA_EMPRESA" ||
        g.estadoPortal === "PARCIAL",
    ).length;
  }, [gruposSeleccionados]);

  const idComandasGruposSeleccionados = useMemo(
    () => gruposSeleccionados.flatMap((g) => g.idComandas),
    [gruposSeleccionados],
  );

  const enviar = useCallback(async () => {
    if (!proveedorSel || !numSel) return;
    const idLineas = Array.from(seleccion);
    if (idLineas.length === 0) {
      setMsgEnvio({ type: "err", text: "Selecciona al menos una línea pendiente." });
      return;
    }
    setEnviando(true);
    setMsgEnvio(null);
    setMsgRevision(null);
    try {
      const r = await fetch("/api/comandes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomProveedor: proveedorSel,
          numComanda: numSel,
          idLineas,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al enviar");
      setMsgEnvio({ type: "ok", text: j.mensaje ?? "Guardado." });
      setSeleccion(new Set());
      await cargarLineas(proveedorSel, numSel);
      await fetchResumenComandas(proveedorSel);
    } catch (e) {
      setMsgEnvio({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setEnviando(false);
    }
  }, [proveedorSel, numSel, seleccion, cargarLineas, fetchResumenComandas]);

  const desmarcarEnvio = useCallback(async () => {
    if (!proveedorSel || !numSel || me?.rol !== "PROVEEDOR") return;
    const idLineas = idLineasEnviadasSeleccionadas;
    if (idLineas.length === 0) {
      setMsgEnvio({
        type: "err",
        text: "Selecciona líneas naranjas (enviadas y aún sin confirmar por administración) para quitar el envío.",
      });
      return;
    }
    setDesmarcando(true);
    setMsgEnvio(null);
    setMsgRevision(null);
    try {
      const r = await fetch("/api/comandes/desmarcar-envio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomProveedor: proveedorSel,
          numComanda: numSel,
          idLineas,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al quitar el envío");
      setMsgEnvio({ type: "ok", text: j.mensaje ?? "Listo." });
      setSeleccion(new Set());
      await cargarLineas(proveedorSel, numSel);
      await fetchResumenComandas(proveedorSel);
    } catch (e) {
      setMsgEnvio({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setDesmarcando(false);
    }
  }, [
    proveedorSel,
    numSel,
    me?.rol,
    idLineasEnviadasSeleccionadas,
    cargarLineas,
    fetchResumenComandas,
  ]);

  const revisionAdmin = useCallback(
    async (accion: "aceptar" | "rechazar", comentarioDeclinacion?: string) => {
      if (!proveedorSel || !numSel) return;
      const idLineas = idComandasGruposSeleccionados;
      if (idLineas.length === 0) {
        setMsgRevision({
          type: "err",
          text: "Selecciona al menos una referencia (fila agrupada).",
        });
        return;
      }
      setRevisando(true);
      setMsgRevision(null);
      try {
        const body =
          accion === "rechazar"
            ? { idLineas, accion, comentarioDeclinacion: (comentarioDeclinacion ?? "").trim() }
            : { idLineas, accion };
        const r = await fetch("/api/comandes/recibir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error al guardar");
        const n = typeof j.actualizadas === "number" ? j.actualizadas : 0;
        setMsgRevision({
          type: accion === "aceptar" || n > 0 ? "ok" : "warn",
          text: j.mensaje ?? (n > 0 ? "Guardado." : "Sin cambios."),
        });
        if (accion === "rechazar") {
          setModalDeclinar(false);
          setComentarioDeclinar("");
          setErrModalDeclinar(null);
        }
        setSeleccion(new Set());
        await cargarLineas(proveedorSel, numSel);
        await fetchResumenComandas(proveedorSel);
      } catch (e) {
        const text = e instanceof Error ? e.message : "Error";
        setMsgRevision({ type: "err", text });
        if (accion === "rechazar") setErrModalDeclinar(text);
      } finally {
        setRevisando(false);
      }
    },
    [proveedorSel, numSel, idComandasGruposSeleccionados, cargarLineas, fetchResumenComandas],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const progresoLineasActuales = useMemo(() => {
    if (lineas.length === 0) return null;
    const enviadas = lineas.filter((g) => grupoCompletadoParaProgreso(g.estadoPortal)).length;
    return { enviadas, total: lineas.length };
  }, [lineas]);

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm">
        Cargando sesión…
      </div>
    );
  }

  if (bootErr) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bootErr}</div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {me?.rol === "ADMIN" && (
        <div className="order-1 shrink-0">
          <LineasLeyenda rol="ADMIN" />
        </div>
      )}

        {/* Líneas: orden visual con flex order (admin: leyenda → proveedor/comanda → líneas → globales; proveedor: tus comandas → líneas → leyenda) */}
        <section
          className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${me?.rol === "ADMIN" ? "order-3" : "order-2"}`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Líneas</h2>
              {me?.rol === "PROVEEDOR" && (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                  Piezas iguales en distintos conjuntos se suman en una sola fila (cantidad total). El estado es del{" "}
                  <strong className="text-zinc-800">grupo</strong>: hay que enviar o confirmar todas las unidades juntas.
                  Toca pendientes, <strong className="text-amber-800">parciales</strong> o declinadas y pulsa{" "}
                  <strong className="text-orange-700">Enviar selección</strong>.
                </p>
              )}
              {me?.rol === "ADMIN" && (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                  Selecciona referencias (agrupadas por pieza + OP) y confirma o declina en empresa. No hace falta que el
                  proveedor las haya marcado como enviadas: puedes confirmar en <strong className="text-zinc-800">blanco</strong>,
                  naranja, parcial o declinada.
                </p>
              )}
              {progresoLineasActuales && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                  <span className="tabular-nums text-base font-semibold text-zinc-900">
                    {progresoLineasActuales.enviadas}/{progresoLineasActuales.total}
                  </span>
                  <span>
                    {me?.rol === "PROVEEDOR" ? "referencias enviadas o confirmadas" : "referencias enviadas o recibidas"}
                  </span>
                  {progresoLineasActuales.enviadas === progresoLineasActuales.total && progresoLineasActuales.total > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      Comanda completa
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
              {me?.rol === "ADMIN" ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void revisionAdmin("aceptar")}
                    disabled={!proveedorSel || !numSel || revisando || numSeleccionados === 0}
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
                  >
                    {revisando ? "Guardando…" : "Confirmar recepción"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrModalDeclinar(null);
                      setComentarioDeclinar("");
                      setModalDeclinar(true);
                    }}
                    disabled={!proveedorSel || !numSel || revisando || numSeleccionados === 0}
                    className="w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
                  >
                    Declinar recepción
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void enviar()}
                    disabled={!proveedorSel || !numSel || enviando || desmarcando || numPendientesORechazoSeleccion === 0}
                    className="w-full shrink-0 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
                  >
                    {enviando ? "Guardando…" : "Enviar selección"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void desmarcarEnvio()}
                    disabled={
                      !proveedorSel || !numSel || enviando || desmarcando || idLineasEnviadasSeleccionadas.length === 0
                    }
                    className="w-full shrink-0 rounded-xl border-2 border-zinc-400 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none sm:w-auto"
                  >
                    {desmarcando ? "Quitando…" : "Quitar envío"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {!proveedorSel || !numSel ? (
            <p className="mt-6 text-xs text-zinc-500">
              {me?.rol === "ADMIN" ? "Elige proveedor y comanda arriba." : (
                <>Elige una comanda en <strong className="text-zinc-700">Tus comandas</strong> arriba.</>
              )}
            </p>
          ) : loadingLin ? (
            <p className="mt-6 text-sm text-zinc-500">Cargando líneas…</p>
          ) : errLin ? (
            <p className="mt-6 text-sm text-red-600">{errLin}</p>
          ) : (
            <>
              {msgRevision && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    msgRevision.type === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : msgRevision.type === "warn"
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-red-200 bg-red-50 text-red-900"
                  }`}
                >
                  {msgRevision.text}
                </div>
              )}
              {msgEnvio && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    msgEnvio.type === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {msgEnvio.text}
                </div>
              )}
              {(me?.rol === "PROVEEDOR" || me?.rol === "ADMIN") && (
                <p className="mt-3 text-xs text-zinc-500">
                  {numSeleccionados > 0 ? `${numSeleccionados} referencia(s) seleccionada(s).` : "Nada seleccionado."}
                </p>
              )}
              <div className="mt-3 max-h-[min(70vh,40rem)] space-y-1.5 overflow-y-auto pr-1">
                {lineas.map((g) => {
                  const sel = grupoSeleccionado(g, seleccion);
                  const bloqueada = !puedeSeleccionarGrupo(g);
                  const estadoEtiqueta = etiquetaEstadoGrupo(g.estadoPortal);
                  const fechaIns = g.fechaInsercion
                    ? new Date(g.fechaInsercion).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—";
                  return (
                    <article
                      key={g.grupoKey}
                      role={bloqueada ? undefined : "button"}
                      tabIndex={bloqueada ? undefined : 0}
                      onClick={() => toggleGrupo(g)}
                      onKeyDown={(ev) => {
                        if (bloqueada) return;
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          toggleGrupo(g);
                        }
                      }}
                      className={`rounded-lg px-3 py-2 text-left transition ${cardTone(g, sel)} ${bloqueada ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 sm:items-center">
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Pieza</span>
                            <p className="truncate font-mono text-sm font-semibold text-zinc-900">{g.codiPieza ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">OP</span>
                            <p className="truncate font-mono text-sm font-semibold text-zinc-900">{g.OP ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Entradas / pedido</span>
                            <p className="text-sm font-semibold text-zinc-900">
                              <span className="tabular-nums">
                                {g.unidadesEntradasAsignadasGrupo ?? 0}/{g.cantidadTotal}
                              </span>
                              {g.filas > 1 ? (
                                <span className="ml-1 text-xs font-normal text-zinc-500">({g.filas} conjuntos)</span>
                              ) : null}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Inserción</span>
                            <p className="text-xs text-zinc-600">{fechaIns}</p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeEstadoGrupo(g.estadoPortal)}`}
                        >
                          {estadoEtiqueta}
                        </span>
                      </div>
                      {g.comentarioDeclinacionGrupo ? (
                        <div
                          className="mt-2 flex gap-2 border-t border-rose-200/80 pt-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <span className="shrink-0 text-amber-600" title="Motivo de la declinación (empresa)">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-5 w-5"
                              aria-hidden
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                          <details className="min-w-0 flex-1 text-xs text-rose-950">
                            <summary className="cursor-pointer font-semibold text-rose-900 outline-none marker:text-rose-700">
                              Motivo de la declinación (empresa)
                            </summary>
                            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-rose-950/95">
                              {g.comentarioDeclinacionGrupo}
                            </p>
                          </details>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

      {me?.rol === "PROVEEDOR" && (
        <div className="order-3 shrink-0">
          <LineasLeyenda rol="PROVEEDOR" />
        </div>
      )}

      {me?.rol === "ADMIN" && (
        <section className="order-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-900">Todas las comandas</h2>
          <ComandasGlobalesDataTable
            variant="violet"
            rows={comandasGlobales}
            loading={loadingGlob}
            error={errGlob}
            onOpen={(prov, com) => {
              void (async () => {
                await cargarComandas(prov);
                await cargarLineas(prov, com);
              })();
            }}
          />
        </section>
      )}

        <section
          className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${me?.rol === "ADMIN" ? "order-2" : "order-1"}`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                {me?.rol === "ADMIN" ? "Proveedor y comanda" : "Tus comandas"}
              </h2>
              {me?.rol === "PROVEEDOR" && (
                <p className="mt-1 text-xs text-zinc-500">
                  Solo ves las comandas que te corresponden. Elige el número para cargar las líneas abajo.
                </p>
              )}
            </div>
            {me?.rol === "PROVEEDOR" && (
              <Link
                href="/comandas/ayuda"
                className="shrink-0 text-xs font-medium text-sky-600 hover:text-sky-800"
              >
                Guía rápida →
              </Link>
            )}
          </div>
          <div className={`mt-4 grid gap-5 ${me?.rol === "ADMIN" ? "md:grid-cols-2" : ""}`}>
            {me?.rol === "ADMIN" && (
              <div>
                <label htmlFor="sel-proveedor" className="text-xs font-medium text-zinc-600">
                  Proveedor
                </label>
                <select
                  id="sel-proveedor"
                  className={selectClass(loadingProv)}
                  disabled={loadingProv || !!errProv}
                  value={proveedorSel ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setProveedorSel(null);
                      setComandas([]);
                      setNumSel(null);
                      setLineas([]);
                      setSeleccion(new Set());
                      setMsgEnvio(null);
                      setMsgRevision(null);
                      setErrCom(null);
                      return;
                    }
                    void cargarComandas(v);
                  }}
                >
                  <option value="">— Elige proveedor —</option>
                  {proveedores.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {loadingProv && <p className="mt-1 text-xs text-zinc-500">Cargando lista…</p>}
                {errProv && <p className="mt-1 text-xs text-red-600">{errProv}</p>}
              </div>
            )}
            <div className={me?.rol === "ADMIN" ? "" : "md:col-span-2"}>
              <label htmlFor="sel-comanda" className="text-xs font-medium text-zinc-600">
                Nº comanda
              </label>
              <select
                id="sel-comanda"
                className={selectClass(!proveedorSel || loadingCom)}
                disabled={!proveedorSel || loadingCom || !!errCom}
                value={numSel ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || !proveedorSel) {
                    setNumSel(null);
                    setLineas([]);
                    setSeleccion(new Set());
                    setMsgEnvio(null);
                    setMsgRevision(null);
                    return;
                  }
                  void cargarLineas(proveedorSel, v);
                }}
              >
                <option value="">— Elige comanda —</option>
                {comandasOrdenSelect.map((c) => {
                  const completa = esComandaCompleta(c);
                  const suf = completa ? " ✓" : "";
                  return (
                    <option key={c.numComanda} value={c.numComanda} style={comandaOptionStyle(c)}>
                      {c.numComanda} ({c.enviadas}/{c.total}){suf}
                    </option>
                  );
                })}
              </select>
              {proveedorSel && loadingCom && <p className="mt-1 text-xs text-zinc-500">Cargando comandas…</p>}
              {proveedorSel && errCom && <p className="mt-1 text-xs text-red-600">{errCom}</p>}
            </div>
          </div>
        </section>

      {modalDeclinar && me?.rol === "ADMIN" && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !revisando) {
              setModalDeclinar(false);
              setErrModalDeclinar(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="declinar-titulo"
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 id="declinar-titulo" className="text-base font-semibold text-zinc-900">
              Motivo de la declinación
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              El proveedor verá este comentario bajo la referencia (icono de aviso) hasta que la recepción quede
              confirmada en empresa.
            </p>
            <label htmlFor="declinar-comentario" className="mt-4 block text-xs font-medium text-zinc-700">
              Comentario
            </label>
            <textarea
              id="declinar-comentario"
              value={comentarioDeclinar}
              onChange={(e) => setComentarioDeclinar(e.target.value)}
              placeholder="Explica el motivo (mínimo 5 caracteres)."
              maxLength={8000}
              disabled={revisando}
              rows={5}
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:bg-zinc-100 disabled:text-zinc-500"
            />
            {errModalDeclinar ? <p className="mt-2 text-sm text-red-600">{errModalDeclinar}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={revisando}
                onClick={() => {
                  setModalDeclinar(false);
                  setErrModalDeclinar(null);
                }}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={revisando}
                onClick={() => {
                  const t = comentarioDeclinar.trim();
                  if (t.length < 5) {
                    setErrModalDeclinar("Indica al menos 5 caracteres explicando el motivo.");
                    return;
                  }
                  setErrModalDeclinar(null);
                  void revisionAdmin("rechazar", t);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {revisando ? "Guardando…" : "Declinar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
