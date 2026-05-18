"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get("from") || "/dashboard";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "Error al iniciar sesión");
        return;
      }
      router.replace(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(56,189,248,0.18),transparent)]" />
      <main className="relative mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo-astech.png"
            alt="Astech"
            width={320}
            height={120}
            priority
            className="mx-auto h-auto w-full max-w-[min(100%,20rem)] object-contain"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400/90">SaaS control piezas</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-zinc-400">Cada proveedor ve solo sus comandas. Tras entrar irás al panel.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="login" className="text-xs font-medium text-zinc-400">
                Usuario o email
              </label>
              <input
                id="login"
                type="text"
                autoComplete="username"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="admin o tu@empresa.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="••••••••"
              />
            </div>
            {err && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-600">SaaS control piezas · acceso seguro</p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">Cargando…</motion>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
