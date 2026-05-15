/** API mínima de DataTables para búsqueda por columna. */
export type ColumnFilterApi = {
  column: (idx: number) => {
    searchable: () => boolean;
    search: (value: string) => ColumnFilterApi;
  };
  draw: () => void;
};

type DataTableCtor = {
  Api: new (context: unknown) => ColumnFilterApi;
};

function isSettingsObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && "aoColumns" in v;
}

function resolveApi(apiOrSettings: unknown, DataTable?: DataTableCtor): ColumnFilterApi | null {
  if (isSettingsObject(apiOrSettings) && DataTable?.Api) {
    return new DataTable.Api(apiOrSettings);
  }

  const raw = apiOrSettings as ColumnFilterApi & {
    api?: () => ColumnFilterApi;
    column?: (idx: number) => unknown;
  };
  if (typeof raw?.column === "function" && typeof raw?.draw === "function") {
    return raw;
  }
  if (typeof raw?.api === "function") {
    return raw.api();
  }
  return null;
}

/** Tabla visible que pinta DataTables dentro del host del portal. */
function findDataTableThead(container: HTMLElement): HTMLTableSectionElement | null {
  const tables = container.querySelectorAll("table.dataTable");
  for (let i = tables.length - 1; i >= 0; i--) {
    const thead = tables[i].querySelector("thead");
    const headerCells = thead?.querySelectorAll("tr:first-child th, tr:first-child td");
    if (thead && headerCells && headerCells.length > 0) {
      return thead;
    }
  }
  return container.querySelector("table thead");
}

/**
 * Segunda fila del thead con un input por columna (filtro individual).
 * @param container — div `.portal-datatable` donde vive la tabla
 * @param apiOrSettings — Api o `settings` de initComplete
 */
export function attachPortalColumnFilters(
  container: HTMLElement,
  apiOrSettings: unknown,
  DataTable?: DataTableCtor,
) {
  const api = resolveApi(apiOrSettings, DataTable);
  if (!api) return;

  const thead = findDataTableThead(container);
  if (!thead || thead.querySelector("tr.dt-column-filters")) return;

  const headerRow = thead.querySelector("tr");
  if (!headerRow) return;

  const n = headerRow.querySelectorAll("th, td").length;
  if (n === 0) return;

  const filterRow = document.createElement("tr");
  filterRow.className = "dt-column-filters";

  for (let i = 0; i < n; i++) {
    const th = document.createElement("th");
    th.className = "dt-filter-cell";

    let searchable = true;
    try {
      searchable = api.column(i).searchable();
    } catch {
      searchable = true;
    }

    if (!searchable) {
      filterRow.appendChild(th);
      continue;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Buscar…";
    input.className = "dt-column-filter-input";
    input.setAttribute("aria-label", `Filtrar columna ${i + 1}`);

    const colIndex = i;
    const apply = () => {
      try {
        api.column(colIndex).search(input.value);
        api.draw();
      } catch {
        /* columna sin búsqueda */
      }
    };

    input.addEventListener("keyup", apply);
    input.addEventListener("change", apply);
    input.addEventListener("search", apply);

    th.appendChild(input);
    filterRow.appendChild(th);
  }

  thead.appendChild(filterRow);
}

/** `initComplete` + refuerzo tras `new DataTable()` */
export function makeInitCompleteWithColumnFilters(container: HTMLElement, DataTable: DataTableCtor) {
  const run = (apiOrSettings: unknown) => {
    attachPortalColumnFilters(container, apiOrSettings, DataTable);
  };
  return function initComplete(settings?: unknown) {
    run(settings);
  };
}
