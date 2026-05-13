import Link from "next/link";
import { ComandasExplorer } from "./ComandasExplorer";

export const dynamic = "force-dynamic";

export default function ComandasPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Explorador</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Comandas por proveedor</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Flujo sencillo: proveedor → número de comanda → líneas. Las líneas pendientes se eligen con un clic; al pulsar{" "}
          <strong className="text-orange-600">Enviar selección</strong> se guardan y quedan en naranja. Cuando recibas la pieza en empresa, podrás marcarlas como recibidas (API preparada).
        </p>
        <p className="mt-3 text-sm">
          <Link href="/comandes-origen" className="font-medium text-sky-700 hover:underline">
            Ver tabla completa (origen) →
          </Link>
        </p>
      </header>

      <ComandasExplorer />
    </main>
  );
}
