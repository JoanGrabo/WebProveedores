"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

function HubCard({
  href,
  title,
  desc,
  gradient,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  gradient: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100 transition hover:-translate-y-0.5 hover:border-sky-200/80 hover:shadow-lg hover:shadow-sky-500/10"
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition group-hover:opacity-60 ${gradient}`}
      />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">{desc}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 group-hover:text-sky-700">
            Abrir
            <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

type PendienteRecepcion = {
  nomProveedor: string;
  numComanda: string;
  lineasPendientes: number;
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [pendientesRecepcion, setPendientesRecepcion] = useState<PendienteRecepcion[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [errPendientes, setErrPendientes] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/auth/me");
      if (r.ok) setMe((await r.json()) as Me);
    })();
  }, []);

  const admin = me?.rol === "ADMIN";

  useEffect(() => {
    if (!admin) return;
    let cancel = false;
    void (async () => {
      setCargandoPendientes(true);
      setErrPendientes(null);
      try {
        const r = await fetch("/api/comandes/explore?step=pendientes-recepcion-admin");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Error al cargar pendientes");
        if (cancel) return;
        setPendientesRecepcion(Array.isArray(j.comandas) ? j.comandas : []);
      } catch (e) {
        if (!cancel) {
          setErrPendientes(e instanceof Error ? e.message : "Error");
          setPendientesRecepcion([]);
        }
      } finally {
        if (!cancel) setCargandoPendientes(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [admin]);

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-sm ring-1 ring-zinc-100 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/80 via-transparent to-indigo-50/60" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600/90">Panel</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Hola{me ? `, ${me.nombre.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600">
            Desde aquí accedes al explorador de comandas y, si eres administrador, a la gestión de usuarios y a la vista de datos origen.
          </p>
        </div>
      </div>

      {admin && (
        <section className="rounded-2xl border border-orange-200/90 bg-orange-50/40 p-6 shadow-sm ring-1 ring-orange-100 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-950">Comandas pendientes de confirmar recepción</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-orange-950/85">
            Líneas que el proveedor marcó como <strong>enviadas</strong> (naranja) y ningún administrador ha confirmado aún como recibidas. Pulsa{" "}
            <strong>Abrir</strong> para ir al explorador con esa comanda cargada.
          </p>
          {cargandoPendientes ? (
            <p className="mt-4 text-sm text-orange-900/80">Cargando…</p>
          ) : errPendientes ? (
            <p className="mt-4 text-sm text-red-700">{errPendientes}</p>
          ) : pendientesRecepcion.length === 0 ? (
            <p className="mt-4 text-sm text-orange-900/75">No hay envíos pendientes de confirmación en este momento.</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-xl border border-orange-200/80 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-orange-100/90 text-xs font-semibold uppercase text-orange-950">
                  <tr>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Comanda</th>
                    <th className="px-4 py-3">Líneas por confirmar</th>
                    <th className="w-28 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pendientesRecepcion.map((row) => {
                    const href = `/comandas?proveedor=${encodeURIComponent(row.nomProveedor)}&comanda=${encodeURIComponent(row.numComanda)}`;
                    return (
                      <tr key={`${row.nomProveedor}|${row.numComanda}`} className="border-t border-zinc-100">
                        <td className="px-4 py-3 text-zinc-800">{row.nomProveedor}</td>
                        <td className="px-4 py-3 font-mono text-zinc-900">{row.numComanda}</td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700">{row.lineasPendientes}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            className="inline-flex rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                          >
                            Abrir
                          </Link>
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

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Accesos rápidos</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <HubCard
            href="/comandas"
            title="Comandas"
            desc="Explora por proveedor, envía líneas y revisa el estado frente a la tabla comandes."
            gradient="bg-sky-400"
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          {admin && (
            <HubCard
              href="/admin/usuarios"
              title="Usuarios"
              desc="Crea y edita cuentas de proveedor o administrador; asigna el nombre de proveedor alineado con comandes."
              gradient="bg-violet-400"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          )}
          {admin && (
            <HubCard
              href="/comandes-origen"
              title="Datos origen"
              desc="Consulta las últimas filas de la tabla legacy comandes (solo lectura, administradores)."
              gradient="bg-emerald-400"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {!admin && me?.proveedor && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-5 py-4 text-sm text-amber-950">
          <strong className="font-semibold">Tu proveedor:</strong> {me.proveedor}. En comandas solo verás datos asociados a ese nombre en el sistema.
        </div>
      )}
    </div>
  );
}
