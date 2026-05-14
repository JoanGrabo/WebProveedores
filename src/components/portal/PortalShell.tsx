"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
      ].join(" ")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-300">{icon}</span>
      {label}
    </Link>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/auth/me");
    if (r.status === 401) {
      window.location.href = "/login?from=" + encodeURIComponent(pathname || "/dashboard");
      return;
    }
    setMe((await r.json()) as Me);
  }, [pathname]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const isAdmin = me?.rol === "ADMIN";

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile overlay */}
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-zinc-900/95 shadow-2xl backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/5 px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setNavOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
              P
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SaaS</p>
              <p className="text-sm font-semibold text-white">Control piezas</p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Menú</p>
          <NavItem
            href="/dashboard"
            label="Inicio"
            active={pathname === "/dashboard"}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          />
          <NavItem
            href="/comandas"
            label="Comandas"
            active={pathname?.startsWith("/comandas") ?? false}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          {isAdmin && (
            <NavItem
              href="/admin/usuarios"
              label="Usuarios"
              active={pathname?.startsWith("/admin") ?? false}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          )}
          {isAdmin && (
            <NavItem
              href="/comandes-origen"
              label="Datos origen"
              active={pathname?.startsWith("/comandes-origen") ?? false}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              }
            />
          )}
        </nav>

        <div className="border-t border-white/5 p-3">
          {me && (
            <div className="mb-3 rounded-xl bg-white/5 px-3 py-2">
              <p className="truncate text-sm font-medium text-white">{me.nombre}</p>
              <p className="truncate text-xs text-zinc-500" title={me.email}>
                {me.email}
              </p>
              {isAdmin && (
                <span className="mt-1 inline-block rounded-md bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
                  Admin
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
              onClick={() => setNavOpen(false)}
            >
              Panel
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex-1 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-200/80"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menú"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="truncate text-sm font-semibold text-zinc-800">SaaS control piezas</span>
          <span className="w-10" />
        </header>

        <main className="min-h-[calc(100vh-4rem)] flex-1 bg-gradient-to-b from-zinc-50 to-zinc-100/90 lg:min-h-screen">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
