/** Fila de inputs bajo el thead para filtrar cada columna (DataTables). */
type DtApi = {
  table: () => { node: () => HTMLTableElement };
  columns: () => { count?: () => number; indexes?: () => number[] };
  column: (idx: number) => DtColumn;
};

type DtColumn = {
  searchable: () => boolean;
  search: {
    (): string;
    (value: string): { draw: () => void };
  };
};

function columnCount(api: DtApi, thead: HTMLTableSectionElement): number {
  const fromApi = api.columns().count?.();
  if (typeof fromApi === "number" && fromApi > 0) return fromApi;
  const idx = api.columns().indexes?.();
  if (idx && idx.length > 0) return idx.length;
  const headerRow = thead.querySelector("tr");
  return headerRow ? headerRow.querySelectorAll("th, td").length : 0;
}

export function attachPortalColumnFilters(api: DtApi) {
  const table = api.table().node();
  const thead = table.querySelector("thead");
  if (!thead || thead.querySelector("tr.dt-column-filters")) return;

  const n = columnCount(api, thead);
  if (n === 0) return;

  const filterRow = document.createElement("tr");
  filterRow.className = "dt-column-filters";

  for (let i = 0; i < n; i++) {
    const column = api.column(i);
    const th = document.createElement("th");
    th.className = "dt-filter-cell";

    if (!column.searchable()) {
      filterRow.appendChild(th);
      continue;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Buscar…";
    input.className = "dt-column-filter-input";
    input.setAttribute("aria-label", "Filtrar columna");

    const apply = () => {
      const v = input.value;
      if (column.search() !== v) {
        column.search(v).draw();
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
