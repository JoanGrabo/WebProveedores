"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

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

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

/** Estilo de tarjeta de línea (clic para seleccionar si está pendiente). */
function cardTone(l: Linea, seleccionado: boolean): string {
  if (l.estadoPortal === "RECIBIDA_EMPRESA") {
    return "border-l-[6px] border-emerald-500 bg-emerald-50/95 shadow-sm";
  }
  if (l.estadoPortal === "ENVIADA_PROVEEDOR") {
    return "border-l-[6px] border-orange-400 bg-orange-50 shadow-sm";
  }
  if (seleccionado) {
    return "border border-orange-300 bg-orange-50/90 ring-2 ring-orange-200 shadow-sm";
  }
  return "border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:bg-zinc-50/80";
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{etiqueta}</p>
      <p className="mt-0.5 break-words font-medium text-zinc-900">{valor ?? "—"}</p>
    </div>
  );
}

export function ComandasExplorer() {
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
  const [msgEnvio, setMsgEnvio] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingProv(true);
      setErrProv(null);
      try {
        const r = await fetch(`/api/comandes/explore?${qs({ step: "proveedores" })}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error al cargar proveedores");
        if (!cancel) setProveedores(j.proveedores ?? []);
      } catch (e) {
        if (!cancel) setErrProv(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancel) setLoadingProv(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

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

  const puedeSeleccionar = useCallback((l: Linea) => {
    return l.estadoPortal !== "ENVIADA_PROVEEDOR" && l.estadoPortal !== "RECIBIDA_EMPRESA";
  }, []);

  const toggleLinea = useCallback(
    (l: Linea) => {
      if (!puedeSeleccionar(l)) return;
      setSeleccion((prev) => {
        const n = new Set(prev);
        if (n.has(l.idComanda)) n.delete(l.idComanda);
        else n.add(l.idComanda);
        return n;
      });
      setMsgEnvio(null);
    },
    [puedeSeleccionar],
  );

  const numSeleccionados = useMemo(() => seleccion.size, [seleccion]);

  const enviar = useCallback(async () => {
    if (!proveedorSel || !numSel) return;
    const idLineas = Array.from(seleccion);
    if (idLineas.length === 0) {
      setMsgEnvio({ type: "err", text: "Selecciona al menos una línea pendiente." });
      return;
    }
    setEnviando(true);
    setMsgEnvio(null);
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

  const progresoLineasActuales = useMemo(() => {
    if (lineas.length === 0) return null;
    const enviadas = lineas.filter(
      (l) => l.estadoPortal === "ENVIADA_PROVEEDOR" || l.estadoPortal === "RECIBIDA_EMPRESA",
    ).length;
    return { enviadas, total: lineas.length };
  }, [lineas]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-white ring-1 ring-zinc-300" />
            Pendiente
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-900">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Línea enviada (proveedor)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Línea recibida (empresa)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Comanda completa (todas las líneas enviadas o recibidas)
          </span>
        </div>
        <Link href="/" className="text-sm font-medium text-sky-700 hover:text-sky-900">
          ← Inicio
        </Link>
      </div>

      <div className="flex flex-col gap-8">
        {/* 1 — Proveedores (solo prueba; con login cada usuario verá solo su cuenta) */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">1 · Proveedores</h2>
            <span className="text-[11px] text-zinc-400">Modo prueba · luego se filtrará por sesión</span>
          </div>
          {loadingProv && <p className="mt-4 text-sm text-zinc-500">Cargando…</p>}
          {errProv && <p className="mt-4 text-sm text-red-600">{errProv}</p>}
          {!loadingProv && !errProv && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {proveedores.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => void cargarComandas(p)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                      proveedorSel === p
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-sky-300 hover:bg-white"
                    }`}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2 — Comandas */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">2 · Números de comanda</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Progreso por comanda: líneas ya enviadas o recibidas en empresa frente al total de líneas en esa comanda.
          </p>
          {!proveedorSel && <p className="mt-4 text-sm text-zinc-500">Primero elige un proveedor en el bloque anterior.</p>}
          {proveedorSel && loadingCom && <p className="mt-4 text-sm text-zinc-500">Cargando…</p>}
          {proveedorSel && errCom && <p className="mt-4 text-sm text-red-600">{errCom}</p>}
          {proveedorSel && !loadingCom && !errCom && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comandas.map((c) => {
                const completa = c.total > 0 && c.enviadas >= c.total;
                const seleccionada = numSel === c.numComanda;
                const pct = c.total > 0 ? Math.round((c.enviadas / c.total) * 100) : 0;
                return (
                  <li key={c.numComanda}>
                    <button
                      type="button"
                      onClick={() => void cargarLineas(proveedorSel, c.numComanda)}
                      className={`flex w-full flex-col gap-2 rounded-xl px-4 py-3 text-left transition ${
                        seleccionada
                          ? "bg-sky-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-400/60"
                          : completa
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                            : "border border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-base font-semibold">{c.numComanda}</span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                            seleccionada
                              ? "bg-white/20 text-white"
                              : completa
                                ? "bg-emerald-200 text-emerald-900"
                                : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {c.enviadas}/{c.total}
                        </span>
                      </div>
                      <div
                        className={`h-2 w-full overflow-hidden rounded-full ${
                          seleccionada ? "bg-white/25" : completa ? "bg-emerald-200/80" : "bg-zinc-200"
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            seleccionada ? "bg-white" : completa ? "bg-emerald-500" : "bg-orange-400"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 3 — Líneas (tarjetas verticales) */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">3 · Líneas de la comanda</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                Toca una tarjeta <strong className="text-zinc-800">pendiente</strong> para marcarla; después pulsa{" "}
                <strong className="text-orange-700">Enviar selección</strong>.
              </p>
              {progresoLineasActuales && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                  <span className="tabular-nums text-base font-semibold text-zinc-900">
                    {progresoLineasActuales.enviadas}/{progresoLineasActuales.total}
                  </span>
                  <span>líneas enviadas o recibidas</span>
                  {progresoLineasActuales.enviadas === progresoLineasActuales.total && progresoLineasActuales.total > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      Comanda completa
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!proveedorSel || !numSel || enviando || numSeleccionados === 0}
              className="w-full shrink-0 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none sm:w-auto"
            >
              {enviando ? "Guardando…" : "Enviar selección"}
            </button>
          </div>

          {!proveedorSel || !numSel ? (
            <p className="mt-6 text-sm text-zinc-500">Elige proveedor y comanda en los bloques anteriores.</p>
          ) : loadingLin ? (
            <p className="mt-6 text-sm text-zinc-500">Cargando líneas…</p>
          ) : errLin ? (
            <p className="mt-6 text-sm text-red-600">{errLin}</p>
          ) : (
            <>
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
                {numSeleccionados > 0 ? `${numSeleccionados} tarjeta(s) seleccionadas.` : "Nada seleccionado."}
              </p>
              <div className="mt-4 max-h-[min(70vh,40rem)] space-y-3 overflow-y-auto pr-1">
                {lineas.map((l) => {
                  const sel = seleccion.has(l.idComanda);
                  const bloqueada = !puedeSeleccionar(l);
                  const estadoEtiqueta =
                    l.estadoPortal === "RECIBIDA_EMPRESA"
                      ? "Recibida empresa"
                      : l.estadoPortal === "ENVIADA_PROVEEDOR"
                        ? "Enviada"
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
                      className={`rounded-2xl p-4 text-left transition ${cardTone(l, sel)} ${bloqueada ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-3">
                        <span className="font-mono text-xs font-medium text-zinc-500">Línea #{l.idComanda}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            l.estadoPortal === "RECIBIDA_EMPRESA"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.estadoPortal === "ENVIADA_PROVEEDOR"
                                ? "bg-orange-100 text-orange-900"
                                : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {estadoEtiqueta}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                        <Campo etiqueta="Pieza" valor={<span className="font-mono">{l.codiPieza}</span>} />
                        <Campo etiqueta="Cantidad" valor={l.cantidad} />
                        <Campo etiqueta="Cód. fabricación" valor={<span className="font-mono text-sm">{l.codigoFab}</span>} />
                        <Campo etiqueta="Conjunto" valor={<span className="font-mono text-sm">{l.codigoConjunto}</span>} />
                        <Campo etiqueta="OP" valor={l.OP} />
                        <Campo etiqueta="Tipo" valor={l.tipus} />
                        <Campo etiqueta="Cerrada" valor={l.cerrada == null ? "—" : l.cerrada ? "Sí" : "No"} />
                        <Campo etiqueta="Fecha inserción" valor={fechaIns} />
                        <Campo
                          etiqueta="Reparación"
                          valor={l.reparacion ? <span className="line-clamp-3 font-normal">{l.reparacion}</span> : "—"}
                        />
                      </div>
                      {!bloqueada && (
                        <p className="mt-3 text-[11px] text-zinc-500">Pulsa para incluir o quitar del envío.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Origen: tabla <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-700">comandes</code> · Estado envío/recibo:{" "}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-700">lineas_comandes_estado</code>
      </p>
    </div>
  );
}
