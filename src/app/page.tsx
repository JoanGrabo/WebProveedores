import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.22),transparent)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-[120%] -translate-x-1/2 bg-[radial-gradient(circle,rgba(99,102,241,0.12),transparent_55%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-20 pt-16 sm:px-10 lg:pt-24">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Portal empresa — proveedores
        </div>

        <h1 className="mt-8 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Comandas claras, <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">sin fricción</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Accede al panel para revisar líneas, enviar selección y coordinar con la base <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-zinc-200">comandes</code>.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110"
          >
            Entrar al portal
          </Link>
          <Link
            href="/api/health"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-zinc-200 backdrop-blur transition hover:bg-white/10"
          >
            Estado API
          </Link>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Roles", d: "Admin ve todo; cada proveedor solo sus comandas." },
            { t: "Seguro", d: "Sesión con cookie httpOnly y contraseñas con hash." },
            { t: "Rápido", d: "Explorador compacto y listado global para administración." },
          ].map((x) => (
            <li
              key={x.t}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400 backdrop-blur transition hover:border-white/15 hover:bg-white/[0.05]"
            >
              <p className="font-semibold text-white">{x.t}</p>
              <p className="mt-2 leading-relaxed">{x.d}</p>
            </li>
          ))}
        </ul>

        <p className="mt-auto pt-16 text-center text-xs text-zinc-600">
          ¿Primera vez? Ejecuta <code className="text-zinc-400">./setup.sh</code> o <code className="text-zinc-400">npm run instalar</code> y revisa <code className="text-zinc-400">PASOS.txt</code>.
        </p>
      </main>
    </div>
  );
}
