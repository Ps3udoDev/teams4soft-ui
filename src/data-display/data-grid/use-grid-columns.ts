import * as React from "react";
import type { ColumnDef, ColumnVisibilityState, RowData, Updater } from "@tanstack/react-table";
import type { DataGridCellComponent, DataGridColumn, DataGridFilterValue, DataGridMessages } from "./DataGrid.types";
import type { GridFeatures } from "./table-features";
import { matchesFilter, resolveFilterKind } from "./filters/filter-fns";
import { buildPersistStorageKey, readPersistedVisibility, writePersistedVisibility } from "./persist";
import { compareCellValues, toSortValue } from "./sort";

const subscribeNever = () => () => {};

interface UseGridColumnsArgs<T> {
  columns: DataGridColumn<T>[];
  cellTypes?: Record<string, DataGridCellComponent<T>>;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  persistKey?: string;
  messages: DataGridMessages;
}

export function useGridColumns<T extends RowData>({ columns, columnVisibility, onColumnVisibilityChange, persistKey }: UseGridColumnsArgs<T>): {
  columnDefs: ColumnDef<GridFeatures, T, unknown>[];
  visibility: ColumnVisibilityState;
  setVisibility: (updater: Updater<ColumnVisibilityState>) => void;
} {
  const defaults = React.useMemo(() => Object.fromEntries(columns.map((column) => [column.field, !column.hidden])), [columns]);
  const storageKey = React.useMemo(() => persistKey ? buildPersistStorageKey(persistKey, columns.map((column) => column.field)) : null, [persistKey, columns]);
  const controlled = columnVisibility !== undefined;
  // Al hidratar se pinta lo mismo que en el servidor; lo guardado se aplica justo después.
  const hydrating = React.useSyncExternalStore(subscribeNever, () => false, () => true);
  // El ámbito depende del esquema, no de la identidad del array de columnas.
  // Ajustar durante este render evita mostrar/grabar el mapa del ámbito anterior.
  const scope = JSON.stringify([storageKey, defaults, controlled, hydrating]);
  const restoreVisibility = (): ColumnVisibilityState => ({
    ...defaults,
    ...(!controlled && !hydrating && storageKey ? readPersistedVisibility(storageKey) : null),
  });
  const [storedVisibility, setStoredVisibility] = React.useState(() => ({ scope, value: restoreVisibility() }));
  let localVisibility = storedVisibility.value;
  if (storedVisibility.scope !== scope) {
    localVisibility = restoreVisibility();
    setStoredVisibility({ scope, value: localVisibility });
  }
  const visibility = columnVisibility ?? localVisibility;
  const latestVisibility = React.useRef(visibility);
  latestVisibility.current = visibility;

  const setVisibility = React.useCallback((updater: Updater<ColumnVisibilityState>) => {
    const next = typeof updater === "function" ? updater(latestVisibility.current) : updater;
    if (!controlled) {
      latestVisibility.current = next;
      setStoredVisibility({ scope, value: next });
      if (storageKey) writePersistedVisibility(storageKey, next);
    }
    onColumnVisibilityChange?.(next);
  }, [controlled, scope, storageKey, onColumnVisibilityChange]);

  const columnDefs = React.useMemo<ColumnDef<GridFeatures, T, unknown>[]>(() => columns.map((column) => ({
    id: column.field,
    header: column.header,
    // El accessor alimenta solo el orden; celdas y filtros leen el valor original de la fila.
    accessorFn: (row) => toSortValue(column, row[column.field]),
    sortUndefined: "last",
    sortFn: (rowA, rowB, columnId) => compareCellValues(column, rowA.getValue(columnId), rowB.getValue(columnId)),
    enableSorting: column.sortable ?? true,
    enableHiding: column.hideable ?? true,
    enableResizing: column.resizable ?? false,
    enableColumnFilter: resolveFilterKind(column) !== null,
    filterFn: (row, _columnId, filter: DataGridFilterValue) => matchesFilter(column, row.original[column.field], filter.value, filter.operator),
    size: typeof column.width === "number" ? column.width : undefined,
    minSize: column.minWidth,
    meta: { column },
  })), [columns]);

  return { columnDefs, visibility, setVisibility };
}
