"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ComandasPageIntro } from "./ComandasPageIntro";

type Me = { rol: "ADMIN" | "PROVEEDOR" };

export function ComandasPageHeader() {
  const [rol, setRol] = useState<Me["rol"] | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const r = await fetch("/api/auth/me");
      if (!r.ok || cancel) return;
      const u = (await r.json()) as Me;
      if (!cancel) setRol(u.rol);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (rol === "ADMIN" || rol === null) {
    return null;
  }

  return (
    <header className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Explorador</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Comandas</h1>
        <ComandasPageIntro />
        <p className="mt-4 text-sm">
          <Link href="/dashboard" className="font-medium text-sky-600 hover:text-sky-800">
            ← Volver al panel
          </Link>
        </p>
      </div>
    </header>
  );
}
