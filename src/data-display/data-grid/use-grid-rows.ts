import * as React from "react";
import { createGridRowsStore, type GridChange, type GridRowsStore } from "./grid-rows-store";
import { devWarn, useClientLayoutEffect } from "../../lib";
import { isCellEditable, validateCell, validateRows } from "./validation";
import type { DataGridColumn, DataGridData, DataGridHandle, DataGridMessages } from "./DataGrid.types";

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
  /** Sin edición no hay diff: un `value` refrescado no es un cambio del usuario. */
  editing: boolean;
  messages: DataGridMessages;
  getSelectedIds: () => string[];
  /** Con servidor, cada `value` externo es la página nueva: base nueva, sin diff ni `onChange`. */
  serverSide?: boolean;
  /** Un `value` externo quitó estas filas del store. */
  onRowsGone?: (ids: Set<string>) => void;
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
  /** `false` si no se añadió (id ya existente). */
  addRow: (row: T) => boolean;
  removeRow: (id: string) => void;
  validate: () => boolean;
  /** La grilla pide una fila a `onAddRow`: el siguiente `value` ya no es una carga inicial, sino esa fila. */
  disarmFirstLoad: () => void;
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

  const revalidate = React.useCallback((rowId: string, column: DataGridColumn<T>) => {
    const row = store.getRow(rowId);
    if (row === undefined) return;
    const message = isCellEditable(column, row) ? validateCell(column, (row as Record<string, unknown>)[column.field], row, latest.current.messages) : null;
    setErrors(withCellError(errorsRef.current, rowId, column.field, message));
  }, [store, setErrors]);

  // `validate` y `editable` reciben la fila entera: cambiar un campo puede resolver el error de otro.
  const revalidateRowErrors = React.useCallback((rowId: string) => {
    for (const field of Object.keys(errorsRef.current[rowId] ?? {})) {
      const column = latest.current.columns.find(item => item.field === field);
      if (column) revalidate(rowId, column);
    }
  }, [revalidate]);

  // Un value externo solo revalida lo que ya muestra un error: el resto se valida al confirmar o con validate().
  const revalidateShown = React.useCallback(() => {
    for (const rowId of Object.keys(errorsRef.current)) revalidateRowErrors(rowId);
  }, [revalidateRowErrors]);

  const lastEmittedRows = React.useRef(value);
  // Todo array emitido: un padre asíncrono puede devolver uno anterior al último; ya está en el store y se ignora.
  const emittedRows = React.useRef(new WeakSet<T[]>());
  const seenValue = React.useRef(value);
  // Carga asíncrona: mientras la base esté vacía y no se haya emitido nada, un value nuevo es la base.
  const awaitingFirstLoad = React.useRef((args.value ?? args.defaultValue ?? []).length === 0);
  // Un value nuevo se pinta ya; el store lo adopta justo después, antes de que el navegador pinte.
  const rows = value !== undefined && value !== seenValue.current && value !== lastEmittedRows.current && !emittedRows.current.has(value) ? value : snapshot;
  useClientLayoutEffect(() => {
    seenValue.current = value;
    if (value === undefined || value === lastEmittedRows.current || emittedRows.current.has(value)) return;
    lastEmittedRows.current = value;
    if (latest.current.serverSide) {
      store.reset(value);
      awaitingFirstLoad.current = false;
      // Los borradores abiertos son de la página anterior.
      setRevision(current => current + 1);
    } else {
      const kept = new Set(value.map(row => latest.current.getRowId(row)));
      const gone = new Set(store.getRows().map(row => latest.current.getRowId(row)).filter(id => !kept.has(id)));
      if (awaitingFirstLoad.current) {
        awaitingFirstLoad.current = value.length === 0;
        store.reset(value);
      } else store.replaceCurrent(value);
      if (gone.size > 0) latest.current.onRowsGone?.(gone);
    }
    const live = Object.fromEntries(Object.entries(errorsRef.current).filter(([id]) => store.getRow(id) !== undefined));
    if (Object.keys(live).length !== Object.keys(errorsRef.current).length) setErrors(live);
    revalidateShown();
  }, [value, store, setErrors, revalidateShown]);

  const getData = React.useCallback((): DataGridData<T> => ({
    rows: store.getRows(),
    selectedIds: [...latest.current.getSelectedIds()],
    ...(latest.current.editing ? store.getDiff() : { dirtyIds: [], addedIds: [], removedIds: [] }),
    errors: errorsRef.current,
    isValid: Object.keys(errorsRef.current).length === 0,
  }), [store]);

  const emit = React.useCallback((change: GridChange) => {
    awaitingFirstLoad.current = false;
    lastEmittedRows.current = store.getRows();
    emittedRows.current.add(lastEmittedRows.current);
    latest.current.onChange?.(getData(), change);
  }, [store, getData]);

  const commitCell = React.useCallback<GridRowsApi<T>["commitCell"]>((rowId, column, next, grid) => {
    const change = store.edit(rowId, column.field, next);
    if (!change) {
      if (errorsRef.current[rowId]?.[column.field] !== undefined) revalidate(rowId, column);
      return;
    }
    revalidate(rowId, column);
    revalidateRowErrors(rowId);
    const row = store.getRow(rowId)!;
    // Primero la edición: un patchRow dentro de onCommit no debe llegar a onChange antes que su causa.
    emit(change);
    column.onCommit?.({ row, value: next, prev: change.prev, grid });
  }, [store, revalidate, revalidateRowErrors, emit]);

  const patchRow = React.useCallback((id: string, partial: Partial<T>) => {
    const changes = store.patch(id, partial);
    for (const column of latest.current.columns) {
      if (changes.some(change => change.field === column.field)) revalidate(id, column);
    }
    if (changes.length > 0) revalidateRowErrors(id);
    changes.forEach(emit);
  }, [store, revalidate, revalidateRowErrors, emit]);

  const addRow = React.useCallback((row: T) => {
    if (store.getRow(latest.current.getRowId(row)) !== undefined) {
      devWarn(`DataGrid: cannot add a row with an existing id "${latest.current.getRowId(row)}".`);
      return false;
    }
    emit(store.add(row));
    return true;
  }, [store, emit]);

  const removeRow = React.useCallback((id: string) => {
    const change = store.remove(id);
    if (!change) return;
    if (errorsRef.current[id]) {
      const { [id]: _removed, ...others } = errorsRef.current;
      setErrors(others);
    }
    emit(change);
  }, [store, setErrors, emit]);

  const validate = React.useCallback(() => {
    const next = validateRows(store.getRows(), latest.current.columns, latest.current.getRowId, latest.current.messages);
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [store, setErrors]);

  const reset = React.useCallback((next: T[]) => {
    const change = store.reset(next);
    setErrors({});
    setRevision(current => current + 1);
    emit(change);
  }, [store, setErrors, emit]);

  const disarmFirstLoad = React.useCallback(() => { awaitingFirstLoad.current = false; }, []);

  return { store, rows, errors, setErrors, emit, revision, getData, reset, patchRow, addRow, removeRow, validate, disarmFirstLoad, commitCell };
}
