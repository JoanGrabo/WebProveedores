"use client";

import { useEffect, useRef } from "react";
import type { Config } from "datatables.net";
import { dtLanguageEs } from "./dt-language-es";

export type EntradaRow = {
  idEntrada: number;
  codigoPieza: string;
  unidadesPieza: string;
  numeroAlbaran: string;
  fechaEntrada: string;
  proveedor: string;
  numeroComanda: string;
};

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Props = {
  rows: EntradaRow[];
  loading: boolean;
  error: string | null;
  onDelete: (id: number) => void;
};

export function EntradasAdminDataTable({ rows, loading, error, onDelete }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ destroy: () => void } | null>(null);
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    let cancelled = false;
    let listenerHost: HTMLDivElement | null = null;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest("button.dt-entrada-del");
      if (!btn) return;
      const idStr = btn.getAttribute("data-id");
      if (!idStr) return;
      const id = Number.parseInt(idStr, 10);
      if (!Number.isFinite(id)) return;
      const row = rowsRef.current.find((r) => r.idEntrada === id);
      if (!row) return;
      if (
        !window.confirm(
          `¿Eliminar la entrada #${id} (${row.codigoPieza} · ${row.proveedor})? Esta acción no se puede deshacer.`,
        )
      ) {
        return;
      }
      onDeleteRef.current(id);
    };

    const host = hostRef.current;
    if (!host || loading || error || rows.length === 0) {
      apiRef.current?.destroy();
      apiRef.current = null;
      if (host) host.innerHTML = "";
      return;
    }

    void (async () => {
      await import("datatables.net-dt/css/dataTables.dataTables.css");
      await import("@/components/datatables/datatables-portal.css");
      const { default: DataTable } = await import("datatables.net-dt");
      if (cancelled) return;
      const h = hostRef.current;
      if (!h) return;

      apiRef.current?.destroy();
      apiRef.current = null;
      h.innerHTML = "";
      const table = document.createElement("table");
      table.className = "display stripe hover nowrap w-full text-left text-sm text-zinc-800";
      h.appendChild(table);

      const opts: Config = {
        data: rows,
        columns: [
          {
            data: "fechaEntrada",
            title: "Fecha entrada",
            render: (d: string) => (d ? new Date(d).toLocaleString("es-ES") : "—"),
          },
          { data: "proveedor", title: "Proveedor" },
          { data: "codigoPieza", title: "Código pieza", className: "font-mono text-xs" },
          { data: "unidadesPieza", title: "Unidades", className: "tabular-nums" },
          { data: "numeroAlbaran", title: "Nº albarán", className: "font-mono text-xs" },
          { data: "numeroComanda", title: "Nº comanda", className: "font-mono text-xs" },
          {
            data: "idEntrada",
            title: "Id",
            className: "text-zinc-500",
            render: (id: number) => String(id),
          },
          {
            data: null,
            title: "",
            orderable: false,
            searchable: false,
            className: "w-24",
            render: (_d: unknown, _t: string, row: EntradaRow) =>
              `<button type="button" class="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 dt-entrada-del" data-id="${escAttr(String(row.idEntrada))}">Eliminar</button>`,
          },
        ],
        order: [[0, "desc"]],
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100, 250],
        language: dtLanguageEs,
        autoWidth: false,
      };

      const api = new DataTable(table, opts) as unknown as { destroy: () => void };
      if (cancelled) {
        api.destroy();
        return;
      }
      apiRef.current = api;
      listenerHost = h;
      listenerHost.addEventListener("click", onClick);
    })();

    return () => {
      cancelled = true;
      apiRef.current?.destroy();
      apiRef.current = null;
      if (listenerHost) {
        listenerHost.removeEventListener("click", onClick);
        listenerHost.innerHTML = "";
      }
    };
  }, [rows, loading, error]);

  if (loading) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando…</p>;
  }
  if (error) {
    return <p className="mt-4 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-600">Aún no hay entradas registradas.</p>;
  }

  return (
    <div
      ref={hostRef}
      className="portal-datatable mt-4 min-h-[4rem] overflow-x-auto rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm"
    />
  );
}
