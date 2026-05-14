"use client";

import { useEffect, useRef } from "react";
import type { Config } from "datatables.net";
import DataTable from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";
import { dtLanguageEs } from "./dt-language-es";

export type UsuarioRow = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: string;
  proveedor: string | null;
  createdAt: string;
};

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Props = {
  rows: UsuarioRow[];
  loading: boolean;
  error: string | null;
  onEdit: (u: UsuarioRow) => void;
};

export function UsuariosAdminDataTable({ rows, loading, error, onEdit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ destroy: () => void } | null>(null);
  const onEditRef = useRef(onEdit);
  const rowsRef = useRef(rows);
  onEditRef.current = onEdit;
  rowsRef.current = rows;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || loading) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const btn = t?.closest("button.dt-user-edit");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (!id) return;
      const u = rowsRef.current.find((r) => r.id === id);
      if (u) onEditRef.current(u);
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
    table.className = "display compact stripe hover w-full text-left text-sm";
    host.appendChild(table);

    const opts: Config = {
      data: rows,
      columns: [
        {
          data: "usuario",
          title: "Usuario",
          defaultContent: "—",
          className: "font-mono text-xs",
          render: (d: string | null) => (d == null || d === "" ? "—" : d),
        },
        { data: "email", title: "Email", className: "font-mono text-xs" },
        { data: "nombre", title: "Nombre" },
        {
          data: "rol",
          title: "Rol",
          render: (rol: string) =>
            rol === "ADMIN"
              ? '<span class="rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">ADMIN</span>'
              : '<span class="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">PROVEEDOR</span>',
        },
        {
          data: "proveedor",
          title: "Proveedor",
          defaultContent: "—",
          render: (d: string | null) => (d == null || d === "" ? "—" : d),
        },
        {
          data: "createdAt",
          title: "Alta",
          render: (d: string) => (d ? new Date(d).toLocaleDateString("es-ES") : "—"),
        },
        {
          data: null,
          title: "",
          orderable: false,
          searchable: false,
          className: "w-20",
          render: (_d: unknown, _t: string, row: UsuarioRow) =>
            `<button type="button" class="text-xs font-semibold text-sky-700 hover:underline dt-user-edit" data-id="${escAttr(row.id)}">Editar</button>`,
        },
      ],
      order: [[5, "desc"]],
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100],
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
    return <p className="mt-4 text-sm text-zinc-500">Cargando…</p>;
  }
  if (error) {
    return <p className="mt-4 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-600">No hay usuarios.</p>;
  }

  return <div ref={hostRef} className="mt-4 min-h-[4rem] overflow-x-auto" />;
}
