"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Linea = {
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

/** Estilo de tarjeta de línea (clic para seleccionar según rol y estado). */
function cardTone(l: Linea, seleccionado: boolean, rol: Me["rol"] | null): string {
  if (l.estadoPortal === "RECIBIDA_EMPRESA") {
    return "border-l-[6px] border-emerald-500 bg-emerald-50/95 shadow-sm";
  }
  if (l.estadoPortal === "RECHAZADA_EMPRESA") {
    const base = "border-l-[6px] border-rose-500 bg-rose-50/95 shadow-sm";
    if (seleccionado && rol === "PROVEEDOR") return `${base} ring-2 ring-rose-300`;
    return base;
  }
  if (l.estadoPortal === "ENVIADA_PROVEEDOR") {
    const base = "border-l-[6px] border-orange-400 bg-orange-50 shadow-sm";
    if (seleccionado && (rol === "ADMIN" || rol === "PROVEEDOR")) return `${base} ring-2 ring-orange-300`;
    return base;
  }
  if (seleccionado) {
    return "border border-orange-300 bg-orange-50/90 ring-2 ring-orange-200 shadow-sm";
  }
  return "border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:bg-zinc-50/80";
}

function selectClass(disabled: boolean) {
  return [
    "mt-1.5 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition",
    disabled
      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
      : "border-zinc-300 bg-white text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25",
  ].join(" ");
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
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loadingLin, setLoadingLin] = useState(false);
  const [errLin, setErrLin] = useState<string | null>(null);

  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set());
  const [enviando, setEnviando] = useState(false);
  const [desmarcando, setDesmarcando] = useState(false);
  const [msgEnvio, setMsgEnvio] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [msgRevision, setMsgRevision] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);

  const [comandasGlobales, setComandasGlobales] = useState<ComandaGlobal[]>([]);
  const [loadingGlob, setLoadingGlob] = useState(false);
  const [errGlob, setErrGlob] = useState<string | null>(null);

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
      const raw = (j.lineas ?? []) as Linea[];
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

  const puedeSeleccionarLinea = useCallback(
    (l: Linea) => {
      if (!me) return false;
      if (me.rol === "ADMIN") return l.estadoPortal !== "RECIBIDA_EMPRESA";
      return (
        l.estadoPortal == null ||
        l.estadoPortal === "RECHAZADA_EMPRESA" ||
        l.estadoPortal === "ENVIADA_PROVEEDOR"
      );
    },
    [me],
  );

  const toggleLinea = useCallback(
    (l: Linea) => {
      if (!puedeSeleccionarLinea(l)) return;
      setSeleccion((prev) => {
        const n = new Set(prev);
        if (n.has(l.idComanda)) n.delete(l.idComanda);
        else n.add(l.idComanda);
        return n;
      });
      setMsgEnvio(null);
      setMsgRevision(null);
    },
    [puedeSeleccionarLinea],
  );

  const numSeleccionados = useMemo(() => seleccion.size, [seleccion]);

  const idLineasEnviadasSeleccionadas = useMemo(() => {
    return lineas
      .filter((l) => seleccion.has(l.idComanda) && l.estadoPortal === "ENVIADA_PROVEEDOR")
      .map((l) => l.idComanda);
  }, [lineas, seleccion]);

  const numPendientesORechazoSeleccion = useMemo(() => {
    return lineas.filter(
      (l) =>
        seleccion.has(l.idComanda) &&
        (l.estadoPortal == null || l.estadoPortal === "RECHAZADA_EMPRESA"),
    ).length;
  }, [lineas, seleccion]);

  const idLineasNaranjasSeleccionAdmin = useMemo(() => {
    return lineas
      .filter((l) => seleccion.has(l.idComanda) && l.estadoPortal === "ENVIADA_PROVEEDOR")
      .map((l) => l.idComanda);
  }, [lineas, seleccion]);

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
    async (accion: "aceptar" | "rechazar") => {
      if (!proveedorSel || !numSel) return;
      const idLineas =
        accion === "rechazar"
          ? lineas
              .filter((l) => seleccion.has(l.idComanda) && l.estadoPortal === "ENVIADA_PROVEEDOR")
              .map((l) => l.idComanda)
          : Array.from(seleccion);
      if (idLineas.length === 0) {
        setMsgRevision({
          type: "err",
          text:
            accion === "rechazar"
              ? "Selecciona líneas naranjas (enviadas por el proveedor) para declinar."
              : "Selecciona al menos una línea.",
        });
        return;
      }
      setRevisando(true);
      setMsgRevision(null);
      try {
        const r = await fetch("/api/comandes/recibir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idLineas, accion }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error al guardar");
        const n = typeof j.actualizadas === "number" ? j.actualizadas : 0;
        setMsgRevision({
          type: accion === "aceptar" || n > 0 ? "ok" : "warn",
          text: j.mensaje ?? (n > 0 ? "Guardado." : "Sin cambios."),
        });
        setSeleccion(new Set());
        await cargarLineas(proveedorSel, numSel);
        await fetchResumenComandas(proveedorSel);
      } catch (e) {
        setMsgRevision({ type: "err", text: e instanceof Error ? e.message : "Error" });
      } finally {
        setRevisando(false);
      }
    },
    [proveedorSel, numSel, seleccion, lineas, cargarLineas, fetchResumenComandas],
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const progresoLineasActuales = useMemo(() => {
    if (lineas.length === 0) return null;
    const enviadas = lineas.filter(
      (l) => l.estadoPortal === "ENVIADA_PROVEEDOR" || l.estadoPortal === "RECIBIDA_EMPRESA",
    ).length;
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
    <div className="space-y-8">
        {/* Líneas primero: visibles al abrir comanda desde el panel sin scroll */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Líneas</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                {me?.rol === "ADMIN" ? (
                  <>
                    Puedes marcar <strong className="text-emerald-800">recepción confirmada</strong> en cualquier línea que aún no esté en verde (también si el proveedor no marcó envío). Para{" "}
                    <strong className="text-rose-800">declinar</strong>, selecciona solo filas <strong className="text-orange-800">naranjas</strong>.
                  </>
                ) : (
                  <>
                    Toca las que estén <strong className="text-zinc-800">pendientes</strong> o <strong className="text-rose-800">declinadas</strong>, pulsa{" "}
                    <strong className="text-orange-700">Enviar selección</strong> (naranja). Si una naranja{" "}
                    <strong className="text-zinc-800">aún no</strong> está confirmada por administración, puedes quitar el envío y volver a pendiente.
                  </>
                )}
              </p>
              {progresoLineasActuales && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                  <span className="tabular-nums text-base font-semibold text-zinc-900">
                    {progresoLineasActuales.enviadas}/{progresoLineasActuales.total}
                  </span>
                  <span>
                    {me?.rol === "PROVEEDOR" ? "Enviadas o en verde en empresa" : "líneas enviadas o recibidas"}
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
                    onClick={() => void revisionAdmin("rechazar")}
                    disabled={
                      !proveedorSel || !numSel || revisando || idLineasNaranjasSeleccionAdmin.length === 0
                    }
                    className="w-full rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
                  >
                    {revisando ? "Guardando…" : "Declinar recepción"}
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
            <p className="mt-6 text-sm text-zinc-500">
              {me?.rol === "ADMIN" ? (
                <>
                  Elige proveedor y comanda en <strong className="text-zinc-700">Proveedor y comanda</strong> más abajo para cargar las líneas aquí.
                </>
              ) : (
                <>Elige una comanda en <strong className="text-zinc-700">Tus comandas</strong> más abajo.</>
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
              <p className="mt-3 text-xs text-zinc-500">
                {numSeleccionados > 0 ? `${numSeleccionados} línea(s) seleccionadas.` : "Nada seleccionado."}
              </p>
              <div className="mt-3 max-h-[min(70vh,40rem)] space-y-1.5 overflow-y-auto pr-1">
                {lineas.map((l) => {
                  const sel = seleccion.has(l.idComanda);
                  const bloqueada = !puedeSeleccionarLinea(l);
                  const estadoEtiqueta =
                    l.estadoPortal === "RECIBIDA_EMPRESA"
                      ? "Recibida"
                      : l.estadoPortal === "ENVIADA_PROVEEDOR"
                        ? "Enviada (pendiente revisión)"
                        : l.estadoPortal === "RECHAZADA_EMPRESA"
                          ? "Declinada"
                          : "Pendiente";
                  const fechaIns = l.fechaInsercion
                    ? new Date(l.fechaInsercion).toLocaleString("es-ES", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—";
                  return (
                    <article
                      key={l.idComanda}
                      role={bloqueada ? undefined : "button"}
                      tabIndex={bloqueada ? undefined : 0}
                      onClick={() => toggleLinea(l)}
                      onKeyDown={(ev) => {
                        if (bloqueada) return;
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          toggleLinea(l);
                        }
                      }}
                      className={`rounded-lg px-3 py-2 text-left transition ${cardTone(l, sel, me?.rol ?? null)} ${bloqueada ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 sm:items-center">
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Pieza</span>
                            <p className="truncate font-mono text-sm font-semibold text-zinc-900">{l.codiPieza ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Cantidad</span>
                            <p className="text-sm font-semibold text-zinc-900">{l.cantidad ?? "—"}</p>
                          </div>
                          <div className="min-w-0 sm:col-span-1">
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Conjunto</span>
                            <p className="truncate font-mono text-sm text-zinc-800">{l.codigoConjunto ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-medium uppercase text-zinc-400">Inserción</span>
                            <p className="text-xs text-zinc-600">{fechaIns}</p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            l.estadoPortal === "RECIBIDA_EMPRESA"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.estadoPortal === "ENVIADA_PROVEEDOR"
                                ? "bg-orange-100 text-orange-900"
                                : l.estadoPortal === "RECHAZADA_EMPRESA"
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {estadoEtiqueta}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Leyenda de líneas</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-zinc-300" />
            Pendiente
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-900">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            {me?.rol === "PROVEEDOR" ? "Enviada (esperando confirmación)" : "Línea enviada (proveedor)"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-900">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {me?.rol === "PROVEEDOR" ? "Declinada: puedes volver a enviar" : "Declinada por empresa (el proveedor puede reenviar)"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            {me?.rol === "PROVEEDOR" ? "Confirmada en empresa" : "Línea recibida (empresa)"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {me?.rol === "PROVEEDOR" ? "Comanda completa" : "Comanda completa (todas las líneas enviadas o recibidas)"}
          </span>
        </div>
      </div>

      {me?.rol === "ADMIN" && (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-900">Todas las comandas</h2>
          <p className="mt-1 text-xs text-violet-900/80">
            Listado global (todos los proveedores). Pulsa <strong>Abrir</strong> para cargar esa comanda en las líneas (arriba) y en los desplegables de más abajo.
          </p>
          {loadingGlob ? (
            <p className="mt-4 text-sm text-zinc-600">Cargando listado…</p>
          ) : errGlob ? (
            <p className="mt-4 text-sm text-red-600">{errGlob}</p>
          ) : comandasGlobales.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No hay comandas para listar.</p>
          ) : (
            <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-violet-200/70 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-violet-100/95 text-xs font-semibold uppercase text-violet-950">
                  <tr>
                    <th className="px-3 py-2">Proveedor</th>
                    <th className="px-3 py-2">Comanda</th>
                    <th className="px-3 py-2">Progreso</th>
                    <th className="w-24 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {comandasGlobales.map((row) => {
                    const completa = row.total > 0 && row.enviadas >= row.total;
                    return (
                      <tr key={`${row.nomProveedor}|${row.numComanda}`} className="border-t border-zinc-100">
                        <td className="px-3 py-2 text-zinc-800">{row.nomProveedor}</td>
                        <td className="px-3 py-2 font-mono text-zinc-900">{row.numComanda}</td>
                        <td className="px-3 py-2 tabular-nums text-zinc-700">
                          {row.enviadas}/{row.total}
                          {completa ? " ✓" : ""}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                            onClick={() => {
                              void (async () => {
                                await cargarComandas(row.nomProveedor);
                                await cargarLineas(row.nomProveedor, row.numComanda);
                              })();
                            }}
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                {me?.rol === "ADMIN" ? "Proveedor y comanda" : "Tus comandas"}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {me?.rol === "ADMIN"
                  ? "Puedes usar el listado global o elegir aquí proveedor y comanda. Los usuarios se gestionan desde el menú lateral."
                  : "Solo ves las comandas que te corresponden. Elige el número para cargar las líneas arriba."}
              </p>
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
                {comandas.map((c) => {
                  const completa = c.total > 0 && c.enviadas >= c.total;
                  const suf = completa ? " ✓" : "";
                  return (
                    <option key={c.numComanda} value={c.numComanda}>
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

      {me?.rol === "ADMIN" && (
        <p className="text-center text-xs text-zinc-400">
          Origen: tabla <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-700">comandes</code> · Estado envío/recibo:{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-700">lineas_comandes_estado</code>
        </p>
      )}
    </div>
  );
}
