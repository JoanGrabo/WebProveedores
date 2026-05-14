"use client";

import { useEffect, useRef } from "react";
import type { Config } from "datatables.net";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
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
};

export function ComandasGlobalesDataTable({ rows, loading, error, onOpen }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ destroy: () => void } | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || loading) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest("button.dt-glob-open");
      if (!btn) return;
      const prov = btn.getAttribute("data-prov");
      const com = btn.getAttribute("data-com");
      if (prov != null && com != null) onOpenRef.current(prov, com);
    };

    host.addEventListener("click", onClick);

    if (error || rows.length === 0) {
      apiRef.current?.destroy();
      apiRef.current = null;
      host.innerHTML = "";
      return () => host.removeEventListener("click", onClick);
    }

    apiRef.current?.destroy();
    apiRef.current = null;
    host.innerHTML = "";
    const table = document.createElement("table");
    table.className =
      "display compact stripe hover w-full text-left text-sm text-zinc-800 [&_thead]:bg-violet-100 [&_thead]:text-violet-950";
    host.appendChild(table);

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
          title: "",
          orderable: false,
          searchable: false,
          className: "w-24",
          render: (_d, _t, row: ComandaGlobalRow) =>
            `<button type="button" class="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700 dt-glob-open" data-prov="${escAttr(row.nomProveedor)}" data-com="${escAttr(row.numComanda)}">Abrir</button>`,
        },
      ],
      order: [[1, "asc"]],
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100, 250],
      language: dtLanguageEs,
      autoWidth: false,
    };

    const api = new DataTable(table, opts);
    apiRef.current = api as unknown as { destroy: () => void };

    return () => {
      host.removeEventListener("click", onClick);
      apiRef.current?.destroy();
      apiRef.current = null;
      host.innerHTML = "";
    };
  }, [rows, loading, error]);

  if (loading) {
    return <p className="mt-2 text-sm text-zinc-600">Cargando…</p>;
  }
  if (error) {
    return <p className="mt-2 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-zinc-600">Sin comandas.</p>;
  }

  return <div ref={hostRef} className="mt-2 min-h-[4rem]" />;
}
