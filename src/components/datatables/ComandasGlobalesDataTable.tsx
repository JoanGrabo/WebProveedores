"use client";

import { useEffect, useRef } from "react";
import type { Config } from "datatables.net";
import { makeInitCompleteWithColumnFilters } from "./attach-column-filters";
import { dtLanguageEs } from "./dt-language-es";

export type ComandaGlobalRow = {
  nomProveedor: string;
  numComanda: string;
  total: number;
  enviadas: number;
};

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Props = {
  rows: ComandaGlobalRow[];
  loading: boolean;
  error: string | null;
  onOpen: (nomProveedor: string, numComanda: string) => void;
  /** Cabecera con tinte violeta (bloque comandas admin) */
  variant?: "violet" | "default";
};

export function ComandasGlobalesDataTable({ rows, loading, error, onOpen, variant = "default" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ destroy: () => void } | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    let cancelled = false;
    let listenerHost: HTMLDivElement | null = null;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest("button.dt-glob-open");
      if (!btn) return;
      const prov = btn.getAttribute("data-prov");
      const com = btn.getAttribute("data-com");
      if (prov != null && com != null) onOpenRef.current(prov, com);
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

      const onTableReady = makeInitCompleteWithColumnFilters(
        h,
        DataTable as unknown as { Api: new (context: unknown) => import("./attach-column-filters").ColumnFilterApi },
      );

      const opts: Config = {
        data: rows,
        columns: [
          { data: "nomProveedor", title: "Proveedor" },
          { data: "numComanda", title: "Comanda", className: "font-mono" },
          {
            data: null,
            title: "Progreso",
            render: (_d, _t, row: ComandaGlobalRow) => {
              const ok = row.total > 0 && row.enviadas >= row.total;
              return `${row.enviadas}/${row.total}${ok ? " ✓" : ""}`;
            },
          },
          {
            data: null,
            title: "Acciones",
            orderable: false,
            searchable: false,
            className: "w-24",
            render: (_d, _t, row: ComandaGlobalRow) =>
              `<button type="button" class="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dt-glob-open" data-prov="${escAttr(row.nomProveedor)}" data-com="${escAttr(row.numComanda)}">Abrir</button>`,
          },
        ],
        order: [[1, "asc"]],
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100, 250],
        language: dtLanguageEs,
        autoWidth: false,
        initComplete: onTableReady,
      };

      const api = new DataTable(table, opts) as unknown as { destroy: () => void };
      if (cancelled) {
        api.destroy();
        return;
      }
      onTableReady(api);
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
  }, [rows, loading, error, variant]);

  if (loading) {
    return <p className="mt-2 text-sm text-zinc-600">Cargando…</p>;
  }
  if (error) {
    return <p className="mt-2 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-zinc-600">Sin comandas.</p>;
  }

  const skin =
    variant === "violet"
      ? "portal-datatable portal-datatable--violet-head"
      : "portal-datatable";

  return (
    <div
      ref={hostRef}
      className={`${skin} mt-2 min-h-[4rem] overflow-x-auto rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm`}
    />
  );
}
