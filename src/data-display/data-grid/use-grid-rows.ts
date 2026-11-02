import * as React from "react";
import { createGridRowsStore, type GridChange, type GridRowsStore } from "./grid-rows-store";
import { isCellEditable, validateCell } from "./validation";
import type { DataGridColumn, DataGridData, DataGridHandle, DataGridMessages } from "./DataGrid.types";

export const useClientLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export type GridErrors = Record<string, Record<string, string>>;

function withCellError(errors: GridErrors, rowId: string, field: string, message: string | null): GridErrors {
  if ((errors[rowId]?.[field] ?? null) === message) return errors;
  const { [field]: _removed, ...others } = errors[rowId] ?? {};
  const rowErrors = message ? { ...others, [field]: message } : others;
  const { [rowId]: _previous, ...next } = errors;
  return Object.keys(rowErrors).length > 0 ? { ...next, [rowId]: rowErrors } : next;
}

interface UseGridRowsArgs<T> {
  value?: T[];
  defaultValue?: T[];
  getRowId: (row: T) => string;
  onChange?: (data: DataGridData<T>, change: GridChange) => void;
  columns: DataGridColumn<T>[];
  messages: DataGridMessages;
  getSelectedIds: () => string[];
}

export interface GridRowsApi<T> {
  store: GridRowsStore<T>;
  rows: T[];
  errors: GridErrors;
  setErrors: (errors: GridErrors) => void;
  emit: (change: GridChange) => void;
  /** Sube con cada `reset`: invalida los borradores abiertos aunque el valor no cambie. */
  revision: number;
  getData: () => DataGridData<T>;
  reset: (rows: T[]) => void;
  patchRow: (id: string, partial: Partial<T>) => void;
  commitCell: (rowId: string, column: DataGridColumn<T>, value: unknown, grid: DataGridHandle<T>) => void;
}

export function useGridRows<T>(args: UseGridRowsArgs<T>): GridRowsApi<T> {
  const { value } = args;
  const latest = React.useRef(args);
  useClientLayoutEffect(() => { latest.current = args; });
  // defaultValue se lee una sola vez; getRowId siempre es el último.
  const [store] = React.useState(() => createGridRowsStore<T>({
    getRowId: row => latest.current.getRowId(row),
    rows: args.value ?? args.defaultValue ?? [],
  }));
  const snapshot = React.useSyncExternalStore(store.subscribe, store.getRows, store.getRows);
  const [errors, setErrorsState] = React.useState<GridErrors>({});
  const [revision, setRevision] = React.useState(0);
  const errorsRef = React.useRef(errors);
  const setErrors = React.useCallback((next: GridErrors) => {
    errorsRef.current = next;
    setErrorsState(next);
  }, []);

  const lastEmittedRows = React.useRef(value);
  const seenValue = React.useRef(value);
  // Un value nuevo se pinta ya; el store lo adopta justo después, antes de que el navegador pinte.
  const rows = value !== undefined && value !== seenValue.current && value !== lastEmittedRows.current ? value : snapshot;
  useClientLayoutEffect(() => {
    seenValue.current = value;
    if (value === undefined || value === lastEmittedRows.current) return;
    lastEmittedRows.current = value;
    store.replaceCurrent(value);
    const live = Object.fromEntries(Object.entries(errorsRef.current).filter(([id]) => store.getRow(id) !== undefined));
    if (Object.keys(live).length !== Object.keys(errorsRef.current).length) setErrors(live);
  }, [value, store, setErrors]);

  const getData = React.useCallback((): DataGridData<T> => ({
    rows: store.getRows(),
    selectedIds: [...latest.current.getSelectedIds()],
    ...store.getDiff(),
    errors: errorsRef.current,
    isValid: Object.keys(errorsRef.current).length === 0,
  }), [store]);

  const emit = React.useCallback((change: GridChange) => {
    lastEmittedRows.current = store.getRows();
    latest.current.onChange?.(getData(), change);
  }, [store, getData]);

  const revalidate = React.useCallback((rowId: string, column: DataGridColumn<T>) => {
    const row = store.getRow(rowId);
    if (row === undefined) return;
    const message = isCellEditable(column, row) ? validateCell(column, (row as Record<string, unknown>)[column.field], row, latest.current.messages) : null;
    setErrors(withCellError(errorsRef.current, rowId, column.field, message));
  }, [store, setErrors]);

  const commitCell = React.useCallback<GridRowsApi<T>["commitCell"]>((rowId, column, next, grid) => {
    const change = store.edit(rowId, column.field, next);
    if (!change) return;
    revalidate(rowId, column);
    column.onCommit?.({ row: store.getRow(rowId)!, value: next, prev: change.prev, grid });
    emit(change);
  }, [store, revalidate, emit]);

  const patchRow = React.useCallback((id: string, partial: Partial<T>) => {
    const changes = store.patch(id, partial);
    for (const column of latest.current.columns) {
      if (changes.some(change => change.field === column.field)) revalidate(id, column);
    }
    changes.forEach(emit);
  }, [store, revalidate, emit]);

  const reset = React.useCallback((next: T[]) => {
    const change = store.reset(next);
    setErrors({});
    setRevision(current => current + 1);
    emit(change);
  }, [store, setErrors, emit]);

  return { store, rows, errors, setErrors, emit, revision, getData, reset, patchRow, commitCell };
}
