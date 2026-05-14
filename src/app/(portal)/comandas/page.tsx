import Link from "next/link";
import { ComandasExplorer } from "./ComandasExplorer";
import { ComandasPageIntro } from "./ComandasPageIntro";

export const dynamic = "force-dynamic";

type ComandasPageProps = {
  searchParams: { proveedor?: string; comanda?: string };
};

export default function ComandasPage({ searchParams }: ComandasPageProps) {
  const proveedor = typeof searchParams.proveedor === "string" ? searchParams.proveedor : undefined;
  const comanda = typeof searchParams.comanda === "string" ? searchParams.comanda : undefined;

  return (
    <div className="space-y-8">
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

      <ComandasExplorer initialProveedor={proveedor} initialComanda={comanda} />
    </div>
  );
}
