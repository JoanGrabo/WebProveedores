"use client";

import { useEffect, useRef } from "react";
import type { Config } from "datatables.net";
import { makeInitCompleteWithColumnFilters } from "./attach-column-filters";
import { dtLanguageEs } from "./dt-language-es";

export type IncidenciaRow = {
  id: string;
  loteId: string;
  tipoLabel: string;
  nomProveedor: string;
  numComanda: string;
  idLineaComandes: number;
  codiPieza: string | null;
  codigoFab: string | null;
  codigoConjunto: string | null;
  OP: string | null;
  cantidad: number | null;
  comentario: string;
  registradoPorNombre: string;
  createdAt: string;
};

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escHtml(s: string) {
  return escAttr(s).replace(/\n/g, "<br>");
}

type Props = {
  rows: IncidenciaRow[];
  loading: boolean;
  error: string | null;
};

export function IncidenciasAdminDataTable({ rows, loading, error }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let listenerHost: HTMLDivElement | null = null;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const link = t?.closest("a.dt-inc-open");
      if (!link) return;
      e.preventDefault();
      const prov = link.getAttribute("data-prov");
      const com = link.getAttribute("data-com");
      if (prov != null && com != null) {
        const u = `/comandas?proveedor=${encodeURIComponent(prov)}&comanda=${encodeURIComponent(com)}`;
        window.location.href = u;
      }
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
          {
            data: "createdAt",
            title: "Fecha",
            render: (d: string) => (d ? new Date(d).toLocaleString("es-ES") : "—"),
          },
          { data: "nomProveedor", title: "Proveedor" },
          {
            data: "numComanda",
            title: "Comanda",
            className: "font-mono text-xs",
            render: (num: string, _t: string, row: IncidenciaRow) =>
              `<a href="#" class="font-mono text-sky-700 hover:underline dt-inc-open" data-prov="${escAttr(row.nomProveedor)}" data-com="${escAttr(num)}">${escHtml(num)}</a>`,
          },
          { data: "codiPieza", title: "Pieza", className: "font-mono text-xs", defaultContent: "—" },
          { data: "OP", title: "OP", className: "font-mono text-xs", defaultContent: "—" },
          {
            data: "cantidad",
            title: "Cant.",
            className: "tabular-nums",
            render: (n: number | null) => (n != null ? String(n) : "—"),
          },
          { data: "tipoLabel", title: "Tipo" },
          {
            data: "comentario",
            title: "Motivo",
            render: (c: string) => {
              const t = (c ?? "").trim();
              if (!t) return "—";
              const short = t.length > 120 ? `${t.slice(0, 120)}…` : t;
              return `<span title="${escAttr(t)}">${escHtml(short)}</span>`;
            },
          },
          { data: "registradoPorNombre", title: "Registrado por" },
          {
            data: "idLineaComandes",
            title: "Id línea",
            className: "tabular-nums text-zinc-500 text-xs",
            render: (id: number) => String(id),
          },
        ],
        order: [[0, "desc"]],
        pageLength: 25,
        lengthMenu: [10, 25, 50, 100, 500],
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
  }, [rows, loading, error]);

  if (loading) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando…</p>;
  }
  if (error) {
    return <p className="mt-4 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        No hay incidencias registradas en el periodo seleccionado. Las declinaciones de recepción desde ahora quedan
        guardadas de forma permanente.
      </p>
    );
  }

  return (
    <div
      ref={hostRef}
      className="portal-datatable mt-4 min-h-[4rem] overflow-x-auto rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm"
    />
  );
}
