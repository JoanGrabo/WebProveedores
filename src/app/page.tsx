import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Web proveedores</p>
        <h1 className="mt-2 font-sans text-3xl font-semibold text-white">Portal de comandas</h1>
        <p className="mt-3 text-slate-400">
          Base de datos lista si ejecutaste <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">./setup.sh</code> o{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">npm run instalar</code>.
        </p>
      </div>
      <ul className="space-y-3 text-slate-300">
        <li>
          <Link href="/login" className="text-amber-400 underline-offset-4 hover:underline">
            Iniciar sesión (proveedores / admin)
          </Link>
        </li>
        <li>
          Ver comandas (requiere login):{" "}
          <Link href="/comandas" className="text-amber-400 underline-offset-4 hover:underline">
            /comandas
          </Link>
        </li>
        <li>
          Ver filas de la tabla original <code className="text-slate-500">comandes</code> (solo lectura):{" "}
          <Link href="/comandes-origen" className="text-amber-400 underline-offset-4 hover:underline">
            /comandes-origen
          </Link>
        </li>
        <li>
          Comprueba la API:{" "}
          <Link href="/api/health" className="text-amber-400 underline-offset-4 hover:underline">
            /api/health
          </Link>{" "}
          (debe devolver <code className="text-slate-500">ok: true</code>)
        </li>
        <li>
          Usuarios de prueba tras el seed: <span className="text-slate-500">admin@empresa.local</span> /{" "}
          <span className="text-slate-500">proveedor@ejemplo.local</span> (contraseñas en consola del seed)
        </li>
      </ul>
    </main>
  );
}
