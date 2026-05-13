import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const estadoClass: Record<string, string> = {
  ABIERTA: "bg-slate-600 text-white",
  EN_PROCESO: "bg-amber-600 text-white",
  ENVIADA: "bg-sky-600 text-white",
  RECIBIDA_PARCIAL: "bg-violet-600 text-white",
  COMPLETADA: "bg-emerald-600 text-white",
};

export default async function ComandasPage() {
  const lista = await prisma.comanda.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { piezas: true } } },
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tabla nueva</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Comandas (portal)</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Registros en <code className="text-slate-300">comandas</code> creados por el seed o por futura sincronización.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-slate-400 hover:text-white">
            Inicio
          </Link>
          <Link href="/comandes-origen" className="text-amber-400 hover:underline">
            Ver tabla original →
          </Link>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
          No hay comandas en la tabla <code>comandas</code>. Ejecuta el seed o sincroniza desde <code>comandes</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="px-4 py-3 font-medium">Nº comanda</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Piezas</th>
                <th className="px-4 py-3 font-medium">Actualización</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/80 text-slate-200 last:border-0">
                  <td className="px-4 py-3 font-mono text-white">{c.numComanda}</td>
                  <td className="px-4 py-3">{c.nomProveedor}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClass[c.estado] ?? "bg-slate-700"}`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c._count.piezas}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.updatedAt.toLocaleString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
