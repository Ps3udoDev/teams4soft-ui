import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataGridColumn } from "./DataGrid.types";
import { dataGridMessagesEs } from "./messages";
import { buildPersistStorageKey } from "./persist";
import { useGridColumns } from "./use-grid-columns";

type Row = { policy: string; amount: number };
const columns: DataGridColumn<Row>[] = [
  { field: "policy", header: "Póliza", sortable: false, hideable: false },
  { field: "amount", header: "Importe", type: "currency", hidden: true, width: 120, minWidth: 80, resizable: true },
];
const base = { columns, messages: dataGridMessagesEs };
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("useGridColumns", () => {
  it("traduce columnas sin perder la definición original y memoriza por identidad", () => {
    const { result, rerender } = renderHook(() => useGridColumns(base));
    expect(result.current.visibility).toEqual({ policy: true, amount: false });
    const defs = result.current.columnDefs;
    expect(defs[0]).toMatchObject({ id: "policy", enableSorting: false, enableHiding: false, meta: { column: columns[0] } });
    expect(defs[1]).toMatchObject({ id: "amount", size: 120, minSize: 80, enableResizing: true });
    rerender();
    expect(result.current.columnDefs).toBe(defs);
  });
  it("restaura persistencia y guarda actualizaciones sin perder defaults", () => {
    const key = buildPersistStorageKey("policies", ["policy", "amount"]);
    localStorage.setItem(key, JSON.stringify({ policy: false, amount: true }));
    const { result } = renderHook(() => useGridColumns({ ...base, persistKey: "policies" }));
    expect(result.current.visibility).toEqual({ policy: false, amount: true });
    act(() => result.current.setVisibility((previous) => ({ ...previous, amount: false })));
    expect(JSON.parse(localStorage.getItem(key) ?? "null")).toEqual({ policy: false, amount: false });
  });
  it("ignora persistencia en modo controlado y emite el valor resuelto", () => {
    const key = buildPersistStorageKey("policies", ["policy", "amount"]);
    localStorage.setItem(key, JSON.stringify({ policy: false }));
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const onColumnVisibilityChange = vi.fn();
    const { result } = renderHook(() => useGridColumns({ ...base, persistKey: "policies", columnVisibility: { policy: true, amount: false }, onColumnVisibilityChange }));
    act(() => result.current.setVisibility({ policy: false, amount: true }));
    expect(result.current.visibility).toEqual({ policy: true, amount: false });
    expect(onColumnVisibilityChange).toHaveBeenCalledWith({ policy: false, amount: true });
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
  it("no accede a storage sin persistKey", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { result } = renderHook(() => useGridColumns(base));
    act(() => result.current.setVisibility({ amount: true }));
    expect(result.current.visibility.amount).toBe(true);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
  it("monta con defaults aunque storage lance o su JSON sea corrupto", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    const { result, unmount } = renderHook(() => useGridColumns({ ...base, persistKey: "policies" }));
    expect(result.current.visibility).toEqual({ policy: true, amount: false });
    unmount();
    vi.restoreAllMocks();
    localStorage.setItem(buildPersistStorageKey("policies", ["policy", "amount"]), "{broken");
    const second = renderHook(() => useGridColumns({ ...base, persistKey: "policies" }));
    expect(second.result.current.visibility).toEqual({ policy: true, amount: false });
  });

  it("restaura la preferencia correspondiente al cambiar persistKey", () => {
    const keyA = buildPersistStorageKey("page-a", ["policy", "amount"]);
    const keyB = buildPersistStorageKey("page-b", ["policy", "amount"]);
    localStorage.setItem(keyA, JSON.stringify({ policy: false, amount: false }));
    localStorage.setItem(keyB, JSON.stringify({ policy: true, amount: true }));
    const { result, rerender } = renderHook(({ persistKey }) => useGridColumns({ ...base, persistKey }), {
      initialProps: { persistKey: "page-a" },
    });
    expect(result.current.visibility.policy).toBe(false);
    rerender({ persistKey: "page-b" });
    expect(result.current.visibility).toEqual({ policy: true, amount: true });
    act(() => result.current.setVisibility(previous => ({ ...previous, amount: false })));
    expect(JSON.parse(localStorage.getItem(keyA) ?? "null")).toEqual({ policy: false, amount: false });
    expect(JSON.parse(localStorage.getItem(keyB) ?? "null")).toEqual({ policy: true, amount: false });
  });

  it("respeta hidden y descarta preferencias de otro esquema al añadir campos", () => {
    const shortColumns = columns.slice(0, 1);
    const previousKey = buildPersistStorageKey("policies", ["policy"]);
    localStorage.setItem(previousKey, JSON.stringify({ policy: false }));
    const { result, rerender } = renderHook(({ currentColumns }) => useGridColumns({ ...base, columns: currentColumns, persistKey: "policies" }), {
      initialProps: { currentColumns: shortColumns },
    });
    expect(result.current.visibility.policy).toBe(false);
    rerender({ currentColumns: columns });
    expect(result.current.visibility).toEqual({ policy: true, amount: false });
    act(() => result.current.setVisibility(previous => ({ ...previous, policy: false })));
    expect(JSON.parse(localStorage.getItem(previousKey) ?? "null")).toEqual({ policy: false });
    expect(JSON.parse(localStorage.getItem(buildPersistStorageKey("policies", ["policy", "amount"])) ?? "null")).toEqual({ policy: false, amount: false });
  });

  it("conserva preferencias internas si columnas equivalentes cambian de identidad", () => {
    const { result, rerender } = renderHook(({ currentColumns }) => useGridColumns({ ...base, columns: currentColumns }), {
      initialProps: { currentColumns: columns },
    });
    act(() => result.current.setVisibility({ policy: false, amount: true }));
    rerender({ currentColumns: columns.map(column => ({ ...column })) });
    expect(result.current.visibility).toEqual({ policy: false, amount: true });
  });
});
