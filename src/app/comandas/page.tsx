import Link from "next/link";
import { ComandasExplorer } from "./ComandasExplorer";

export const dynamic = "force-dynamic";

export default function ComandasPage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Explorador</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Comandas por proveedor</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Elige proveedor → número de comanda → líneas. Las filas son clicables (resaltado naranja) y puedes pulsar{" "}
            <strong className="text-amber-400">Enviar</strong>.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-slate-400 hover:text-white">
            Inicio
          </Link>
          <Link href="/comandes-origen" className="text-amber-400 hover:underline">
            Tabla completa (origen) →
          </Link>
        </div>
      </div>

      <ComandasExplorer />
    </main>
  );
}
