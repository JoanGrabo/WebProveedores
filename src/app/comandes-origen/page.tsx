import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LIMITE = 500;

type FilaOrigen = {
  idComanda: number;
  numComanda: string | null;
  nomProveedor: string | null;
  codiPieza: string | null;
  cantidad: number | null;
  fechaInsercion: Date | null;
};

export default async function ComandesOrigenPage() {
  const filas = await prisma.$queryRaw<FilaOrigen[]>`
    SELECT idComanda, numComanda, nomProveedor, codiPieza, cantidad, fechaInsercion
    FROM comandes
    ORDER BY idComanda DESC
    LIMIT ${LIMITE}
  `;

  const total = await prisma.$queryRaw<[{ n: bigint }]>`
    SELECT COUNT(*) AS n FROM comandes
  `;
  const totalNum = Number(total[0]?.n ?? 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tabla legacy (solo lectura)</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Comandes (origen)</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Datos de <code className="text-slate-300">websoldadura.comandes</code>. Se muestran las{" "}
            <strong className="text-slate-300">{LIMITE}</strong> filas más recientes de{" "}
            <strong className="text-slate-300">{totalNum.toLocaleString("es-ES")}</strong> totales (solo lectura).
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/" className="text-slate-400 hover:text-white">
            Inicio
          </Link>
          <Link href="/comandas" className="text-amber-400 hover:underline">
            Comandas portal →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-3 py-3 font-medium">idComanda</th>
              <th className="px-3 py-3 font-medium">numComanda</th>
              <th className="px-3 py-3 font-medium">nomProveedor</th>
              <th className="px-3 py-3 font-medium">codiPieza</th>
              <th className="px-3 py-3 font-medium">cantidad</th>
              <th className="px-3 py-3 font-medium">fechaInsercion</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.idComanda} className="border-b border-slate-800/80 text-slate-200 last:border-0">
                <td className="px-3 py-2 font-mono text-slate-400">{r.idComanda}</td>
                <td className="px-3 py-2 font-mono">{r.numComanda ?? "—"}</td>
                <td className="px-3 py-2">{r.nomProveedor ?? "—"}</td>
                <td className="px-3 py-2 font-mono">{r.codiPieza ?? "—"}</td>
                <td className="px-3 py-2">{r.cantidad ?? "—"}</td>
                <td className="px-3 py-2 text-slate-500">
                  {r.fechaInsercion ? new Date(r.fechaInsercion).toLocaleString("es-ES") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
