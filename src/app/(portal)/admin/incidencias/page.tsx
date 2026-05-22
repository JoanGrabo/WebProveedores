"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IncidenciasAdminDataTable,
  type IncidenciaRow,
} from "@/components/datatables/IncidenciasAdminDataTable";

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

type ResumenProveedor = {
  nomProveedor: string;
  incidencias: number;
  lineas: number;
};

type ApiResponse = {
  anio: number;
  desde: string;
  hasta: string;
  totales: {
    incidencias: number;
    lineas: number;
    proveedoresConIncidencias: number;
  };
  resumenProveedores: ResumenProveedor[];
  proveedores: string[];
  incidencias: IncidenciaRow[];
};

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-300";

export default function AdminIncidenciasPage() {
  const anioActual = new Date().getFullYear();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [bootErr, setBootErr] = useState<string | null>(null);

  const [anio, setAnio] = useState(anioActual);
  const [proveedor, setProveedor] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListErr(null);
    try {
      const params = new URLSearchParams({ anio: String(anio) });
      if (proveedor.trim()) params.set("proveedor", proveedor.trim());
      const r = await fetch(`/api/admin/incidencias?${params}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al cargar incidencias");
      setData(j as ApiResponse);
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [anio, proveedor]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setBootErr(null);
      try {
        const r = await fetch("/api/auth/me");
        if (r.status === 401) {
          window.location.href = "/login?from=" + encodeURIComponent("/admin/incidencias");
          return;
        }
        const u = (await r.json()) as Me;
        if (cancel) return;
        setMe(u);
        if (u.rol !== "ADMIN") {
          window.location.href = "/dashboard";
          return;
        }
        await load();
      } catch {
        if (!cancel) setBootErr("No se pudo cargar la sesión.");
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [load]);

  const aniosOpciones = useMemo(() => {
    const out: number[] = [];
    for (let y = anioActual; y >= anioActual - 8; y--) out.push(y);
    return out;
  }, [anioActual]);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm">
        Cargando…
      </div>
    );
  }

  if (bootErr) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bootErr}</div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Administración</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Historial de incidencias</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">
          Cada vez que declinas una recepción en comandas, queda registrada aquí de forma permanente (aunque el proveedor
          vuelva a enviar o confirmes después). Sirve para el seguimiento anual con cada proveedor.
        </p>
        {me && (
          <p className="mt-2 text-xs text-zinc-500">
            Sesión: <strong className="text-zinc-700">{me.nombre}</strong>
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Filtros</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="filtro-anio" className="text-xs font-medium text-zinc-700">
              Año
            </label>
            <select
              id="filtro-anio"
              className={inputClass}
              value={anio}
              onChange={(e) => setAnio(Number.parseInt(e.target.value, 10))}
            >
              {aniosOpciones.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="filtro-prov" className="text-xs font-medium text-zinc-700">
              Proveedor (opcional)
            </label>
            <select
              id="filtro-prov"
              className={inputClass}
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
            >
              <option value="">— Todos —</option>
              {(data?.proveedores ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="mt-4 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {loading ? "Cargando…" : "Aplicar filtros"}
        </button>
      </section>

      {data && !loading && (
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-rose-900/80">Incidencias ({data.anio})</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-rose-950">{data.totales.incidencias}</p>
            <p className="mt-1 text-xs text-rose-900/70">Acciones de declinación (cada pulsación en comandas)</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Líneas registradas</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{data.totales.lineas}</p>
            <p className="mt-1 text-xs text-zinc-500">Filas físicas de comanda afectadas</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-zinc-500">Proveedores con incidencias</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{data.totales.proveedoresConIncidencias}</p>
          </div>
        </section>
      )}

      {data && data.resumenProveedores.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
            Resumen por proveedor ({data.anio})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Usa esta tabla en la reunión anual: incidencias = declinaciones distintas; líneas = conjuntos/piezas
            afectados.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-100 text-xs font-semibold uppercase text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Incidencias</th>
                  <th className="px-4 py-3">Líneas</th>
                </tr>
              </thead>
              <tbody>
                {data.resumenProveedores.map((row) => (
                  <tr key={row.nomProveedor} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-800">{row.nomProveedor}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-rose-800">{row.incidencias}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">{row.lineas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Detalle</h2>
          <Link href="/comandas" className="text-xs font-medium text-sky-600 hover:text-sky-800">
            Ir a comandas →
          </Link>
        </div>
        <IncidenciasAdminDataTable
          rows={data?.incidencias ?? []}
          loading={loading}
          error={listErr}
        />
      </section>
    </div>
  );
}
