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
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm ring-1 ring-zinc-100 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/90">Solo lectura</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tabla comandes (origen)</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              Datos de <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800">comandes</code>. Últimas{" "}
              <strong className="text-zinc-900">{LIMITE}</strong> filas de{" "}
              <strong className="text-zinc-900">{totalNum.toLocaleString("es-ES")}</strong> totales.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
          >
            ← Panel
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">idComanda</th>
                <th className="px-4 py-3">numComanda</th>
                <th className="px-4 py-3">nomProveedor</th>
                <th className="px-4 py-3">codiPieza</th>
                <th className="px-4 py-3">cantidad</th>
                <th className="px-4 py-3">fechaInsercion</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.idComanda} className="border-b border-zinc-100 text-zinc-800 last:border-0 hover:bg-zinc-50/80">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{r.idComanda}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.numComanda ?? "—"}</td>
                  <td className="px-4 py-2.5">{r.nomProveedor ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.codiPieza ?? "—"}</td>
                  <td className="px-4 py-2.5 tabular-nums">{r.cantidad ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {r.fechaInsercion ? new Date(r.fechaInsercion).toLocaleString("es-ES") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
