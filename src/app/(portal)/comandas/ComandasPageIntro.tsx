"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = { rol: "ADMIN" | "PROVEEDOR" };

export function ComandasPageIntro() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const r = await fetch("/api/auth/me");
      if (!r.ok || cancel) return;
      setMe((await r.json()) as Me);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (!me) {
    return <p className="mt-3 max-w-3xl text-sm text-zinc-500">Cargando…</p>;
  }

  if (me.rol === "PROVEEDOR") {
    return (
      <div className="mt-3 max-w-3xl space-y-2 text-sm leading-relaxed text-zinc-600">
        <p>
          Aquí tienes <strong className="text-zinc-800">tus comandas</strong>. Abajo eliges el número de comanda; las líneas aparecen arriba para que puedas actuar enseguida.
        </p>
        <p>
          <Link href="/comandas/ayuda" className="font-medium text-sky-600 hover:text-sky-800">
            Guía rápida: colores y botones
          </Link>
        </p>
      </div>
    );
  }

  return null;
}
