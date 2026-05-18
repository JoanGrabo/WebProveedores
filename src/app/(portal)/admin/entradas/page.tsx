"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { EntradasAdminDataTable, type EntradaRow } from "@/components/datatables/EntradasAdminDataTable";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300";

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEntradasPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [bootErr, setBootErr] = useState<string | null>(null);

  const [entradas, setEntradas] = useState<EntradaRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);

  const [codigoPieza, setCodigoPieza] = useState("");
  const [unidadesPieza, setUnidadesPieza] = useState("");
  const [numeroAlbaran, setNumeroAlbaran] = useState("");
  const [fechaEntrada, setFechaEntrada] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [numeroComanda, setNumeroComanda] = useState("");
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const loadEntradas = useCallback(async () => {
    setLoadingList(true);
    setListErr(null);
    try {
      const r = await fetch("/api/admin/entradas");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al cargar entradas");
      setEntradas(Array.isArray(j.entradas) ? j.entradas : []);
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "Error");
      setEntradas([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    setFechaEntrada(toDatetimeLocalValue(new Date()));
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setBootErr(null);
      try {
        const r = await fetch("/api/auth/me");
        if (r.status === 401) {
          window.location.href = "/login?from=" + encodeURIComponent("/admin/entradas");
          return;
        }
        const u = (await r.json()) as Me;
        if (cancel) return;
        setMe(u);
        if (u.rol !== "ADMIN") {
          window.location.href = "/dashboard";
          return;
        }
        await loadEntradas();
      } catch {
        if (!cancel) setBootErr("No se pudo cargar la sesión.");
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [loadEntradas]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setFormOk(null);
    setCreating(true);
    try {
      const r = await fetch("/api/admin/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoPieza: codigoPieza.trim(),
          unidadesPieza: unidadesPieza.trim(),
          numeroAlbaran: numeroAlbaran.trim(),
          fechaEntrada,
          proveedor: proveedor.trim(),
          numeroComanda: numeroComanda.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al registrar");
      const rf = j.recepcionFifo as
        | {
            unidadesEntradas: number;
            unidadesPedido: number;
            lineasMarcadasRecibidas: number;
            lineas: { pedido: number; asignadoFifo: number; recibida: boolean }[];
          }
        | undefined;
      let msg = `Entrada registrada (#${j.entrada?.idEntrada ?? "—"}).`;
      if (rf && typeof rf.unidadesPedido === "number") {
        msg += ` Acumulado entradas / pedido comanda (esta pieza): ${rf.unidadesEntradas}/${rf.unidadesPedido} uds.`;
        if (rf.lineasMarcadasRecibidas > 0) {
          msg += ` ${rf.lineasMarcadasRecibidas} línea(s) pasan a recibidas en empresa.`;
        }
      }
      setFormOk(msg);
      setCodigoPieza("");
      setUnidadesPieza("");
      setNumeroAlbaran("");
      setProveedor("");
      setNumeroComanda("");
      setFechaEntrada(toDatetimeLocalValue(new Date()));
      await loadEntradas();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function onDeleteEntrada(id: number) {
    setListErr(null);
    try {
      const r = await fetch(`/api/admin/entradas/${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al eliminar");
      await loadEntradas();
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "Error");
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-24 text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }

  if (bootErr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bootErr}</div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Administración</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Entradas</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Registro de piezas recibidas (albarán, proveedor y comanda). Tras guardar, se reparten unidades en FIFO por{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">idComanda</code> sobre la tabla <code className="rounded bg-zinc-100 px-1 text-xs">comandes</code> y, si cubren el pedido de cada línea, se confirma recepción en empresa automáticamente.
        </p>
        {me && (
          <p className="mt-2 text-xs text-zinc-500">
            Sesión: <span className="font-mono text-zinc-700">{me.usuario ? `${me.usuario} · ` : ""}{me.email}</span>
          </p>
        )}
        <p className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/dashboard" className="font-medium text-sky-600 hover:text-sky-800">
            ← Volver al panel
          </Link>
          <Link href="/admin/usuarios" className="font-medium text-violet-600 hover:text-violet-800">
            Usuarios →
          </Link>
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Nueva entrada</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => void onCreate(e)}>
          <div>
            <label className="text-xs font-medium text-zinc-700">Código pieza</label>
            <input required maxLength={45} value={codigoPieza} onChange={(e) => setCodigoPieza(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Unidades pieza</label>
            <input required maxLength={45} value={unidadesPieza} onChange={(e) => setUnidadesPieza(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Nº albarán</label>
            <input required maxLength={45} value={numeroAlbaran} onChange={(e) => setNumeroAlbaran(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Fecha entrada</label>
            <input
              type="datetime-local"
              required
              value={fechaEntrada}
              onChange={(e) => setFechaEntrada(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Proveedor</label>
            <input required maxLength={45} value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Nº comanda</label>
            <input required maxLength={45} value={numeroComanda} onChange={(e) => setNumeroComanda(e.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? "Guardando…" : "Registrar entrada"}
            </button>
            {formErr && <p className="text-sm text-red-600">{formErr}</p>}
            {formOk && <p className="text-sm text-emerald-700">{formOk}</p>}
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Todas las entradas</h2>
        <EntradasAdminDataTable rows={entradas} loading={loadingList} error={listErr} onDelete={onDeleteEntrada} />
      </section>
    </div>
  );
}
