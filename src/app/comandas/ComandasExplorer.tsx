"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
};

function qs(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

export function ComandasExplorer() {
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [errProv, setErrProv] = useState<string | null>(null);

  const [proveedorSel, setProveedorSel] = useState<string | null>(null);
  const [comandas, setComandas] = useState<string[]>([]);
  const [loadingCom, setLoadingCom] = useState(false);
  const [errCom, setErrCom] = useState<string | null>(null);

  const [numSel, setNumSel] = useState<string | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loadingLin, setLoadingLin] = useState(false);
  const [errLin, setErrLin] = useState<string | null>(null);

  const [seleccion, setSeleccion] = useState<Set<number>>(() => new Set());
  const [enviando, setEnviando] = useState(false);
  const [msgEnvio, setMsgEnvio] = useState<string | null>(null);

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

  const cargarComandas = useCallback(async (nom: string) => {
    setProveedorSel(nom);
    setNumSel(null);
    setLineas([]);
    setSeleccion(new Set());
    setMsgEnvio(null);
    setLoadingCom(true);
    setErrCom(null);
    try {
      const r = await fetch(`/api/comandes/explore?${qs({ step: "comandas", proveedor: nom })}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al cargar comandas");
      setComandas(j.numComandas ?? []);
    } catch (e) {
      setErrCom(e instanceof Error ? e.message : "Error");
      setComandas([]);
    } finally {
      setLoadingCom(false);
    }
  }, []);

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
      const raw = (j.lineas ?? []) as (Linea & { fechaInsercion?: Date | string | null })[];
      setLineas(
        raw.map((l) => ({
          ...l,
          fechaInsercion:
            l.fechaInsercion == null
              ? null
              : typeof l.fechaInsercion === "string"
                ? l.fechaInsercion
                : new Date(l.fechaInsercion).toISOString(),
        })),
      );
    } catch (e) {
      setErrLin(e instanceof Error ? e.message : "Error");
      setLineas([]);
    } finally {
      setLoadingLin(false);
    }
  }, []);

  const toggleLinea = useCallback((id: number) => {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setMsgEnvio(null);
  }, []);

  const numSeleccionados = useMemo(() => seleccion.size, [seleccion]);

  const enviar = useCallback(async () => {
    if (!proveedorSel || !numSel) return;
    const idLineas = Array.from(seleccion);
    if (idLineas.length === 0) {
      setMsgEnvio("Selecciona al menos una línea (clic en la fila).");
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
      setMsgEnvio(j.mensaje ?? "Enviado.");
      setSeleccion(new Set());
    } catch (e) {
      setMsgEnvio(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }, [proveedorSel, numSel, seleccion]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Proveedores */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Proveedores</h2>
          {loadingProv && <p className="mt-3 text-sm text-slate-500">Cargando…</p>}
          {errProv && <p className="mt-3 text-sm text-red-400">{errProv}</p>}
          {!loadingProv && !errProv && (
            <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
              {proveedores.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => void cargarComandas(p)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      proveedorSel === p
                        ? "bg-amber-600/30 text-amber-100 ring-1 ring-amber-500/50"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Números de comanda */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Comandas</h2>
          {!proveedorSel && <p className="mt-3 text-sm text-slate-500">Elige un proveedor.</p>}
          {proveedorSel && loadingCom && <p className="mt-3 text-sm text-slate-500">Cargando…</p>}
          {proveedorSel && errCom && <p className="mt-3 text-sm text-red-400">{errCom}</p>}
          {proveedorSel && !loadingCom && !errCom && (
            <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
              {comandas.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => void cargarLineas(proveedorSel, n)}
                    className={`w-full rounded-lg px-3 py-2 text-left font-mono text-sm transition ${
                      numSel === n
                        ? "bg-amber-600/30 text-amber-100 ring-1 ring-amber-500/50"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {n}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Líneas + enviar */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Líneas</h2>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!proveedorSel || !numSel || enviando || numSeleccionados === 0}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
          {!proveedorSel || !numSel ? (
            <p className="mt-3 text-sm text-slate-500">Elige proveedor y número de comanda.</p>
          ) : loadingLin ? (
            <p className="mt-3 text-sm text-slate-500">Cargando líneas…</p>
          ) : errLin ? (
            <p className="mt-3 text-sm text-red-400">{errLin}</p>
          ) : (
            <>
              {msgEnvio && (
                <p className="mt-2 rounded-lg border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
                  {msgEnvio}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Clic en una fila para seleccionarla (naranja). {numSeleccionados > 0 ? `${numSeleccionados} seleccionada(s).` : ""}
              </p>
              <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 text-slate-500">
                    <tr>
                      <th className="px-2 py-2">id</th>
                      <th className="px-2 py-2">Pieza</th>
                      <th className="px-2 py-2">Cant.</th>
                      <th className="px-2 py-2">Fab</th>
                      <th className="px-2 py-2">Conjunto</th>
                      <th className="px-2 py-2">OP</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Cerrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l) => {
                      const sel = seleccion.has(l.idComanda);
                      return (
                        <tr
                          key={l.idComanda}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleLinea(l.idComanda)}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              toggleLinea(l.idComanda);
                            }
                          }}
                          className={`cursor-pointer border-b border-slate-800/80 transition ${
                            sel
                              ? "bg-orange-500/35 text-orange-50 ring-1 ring-inset ring-orange-400/50"
                              : "text-slate-200 hover:bg-slate-800/60"
                          }`}
                        >
                          <td className="px-2 py-2 font-mono text-slate-400">{l.idComanda}</td>
                          <td className="px-2 py-2 font-mono">{l.codiPieza ?? "—"}</td>
                          <td className="px-2 py-2">{l.cantidad ?? "—"}</td>
                          <td className="px-2 py-2 font-mono text-slate-400">{l.codigoFab ?? "—"}</td>
                          <td className="px-2 py-2 font-mono text-slate-400">{l.codigoConjunto ?? "—"}</td>
                          <td className="px-2 py-2">{l.OP ?? "—"}</td>
                          <td className="px-2 py-2">{l.tipus ?? "—"}</td>
                          <td className="px-2 py-2">{l.cerrada ? "Sí" : "No"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-slate-600">
        Datos desde la tabla <code className="text-slate-500">comandes</code>. El botón Enviar confirma la selección (API lista para persistir luego).
      </p>
    </div>
  );
}
