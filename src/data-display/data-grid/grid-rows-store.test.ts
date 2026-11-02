import { describe, expect, it, vi } from "vitest";
import { createGridRowsStore } from "./grid-rows-store";

type Row = { id: string; name: string; qty: number };

const seed = (): Row[] => [
  { id: "r-1", name: "a", qty: 1 },
  { id: "r-2", name: "b", qty: 2 },
  { id: "r-3", name: "c", qty: 3 },
];

const make = () => createGridRowsStore<Row>({ getRowId: (r) => r.id, rows: seed() });

describe("createGridRowsStore", () => {
  it("edita solo la identidad de la fila editada", () => {
    const store = make();
    const before = store.getRows();
    const change = store.edit("r-2", "name", "z");
    const after = store.getRows();
    expect(change).toEqual({ type: "edit", rowId: "r-2", field: "name", prev: "b", next: "z" });
    expect(after[0]).toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[2]).toBe(before[2]);
    expect(store.getRow("r-2")?.name).toBe("z");
  });

  it("editar y volver al valor original deja dirtyIds vacío", () => {
    const store = make();
    store.edit("r-2", "name", "z");
    expect(store.getDiff().dirtyIds).toEqual(["r-2"]);
    store.edit("r-2", "name", "b");
    expect(store.getDiff().dirtyIds).toEqual([]);
  });

  it("edit devuelve null si el valor es igual y no notifica", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    const rows = store.getRows();
    expect(store.edit("r-1", "name", "a")).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    expect(store.getRows()).toBe(rows);
  });

  it("edit con id inexistente devuelve null sin lanzar", () => {
    const store = make();
    expect(store.edit("nope", "name", "x")).toBeNull();
  });

  it("add + remove de la misma fila no aparece en addedIds ni removedIds", () => {
    const store = make();
    const change = store.add({ id: "r-9", name: "n", qty: 9 });
    expect(change.type).toBe("add");
    expect(change.rowId).toBe("r-9");
    expect(store.getDiff().addedIds).toEqual(["r-9"]);
    store.remove("r-9");
    expect(store.getDiff()).toEqual({ dirtyIds: [], addedIds: [], removedIds: [] });
  });

  it("editar una fila agregada solo la deja en addedIds", () => {
    const store = make();
    store.add({ id: "r-9", name: "n", qty: 9 });
    store.edit("r-9", "name", "m");
    expect(store.getDiff()).toEqual({ dirtyIds: [], addedIds: ["r-9"], removedIds: [] });
  });

  it("remove de una fila base la deja en removedIds", () => {
    const store = make();
    const change = store.remove("r-2");
    expect(change).toMatchObject({ type: "remove", rowId: "r-2" });
    expect(store.getDiff().removedIds).toEqual(["r-2"]);
    expect(store.getRows().map((r) => r.id)).toEqual(["r-1", "r-3"]);
    expect(store.getRow("r-3")?.name).toBe("c");
    expect(store.remove("nope")).toBeNull();
  });

  it("add con id existente no hace nada", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    const rows = store.getRows();
    store.add({ id: "r-1", name: "dup", qty: 0 });
    expect(store.getRows()).toBe(rows);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reset limpia los tres y adopta la nueva línea base", () => {
    const store = make();
    store.edit("r-1", "name", "x");
    store.add({ id: "r-9", name: "n", qty: 9 });
    store.remove("r-3");
    const change = store.reset([{ id: "r-5", name: "e", qty: 5 }]);
    expect(change).toMatchObject({ type: "reset", rowId: null, field: null });
    expect(store.getDiff()).toEqual({ dirtyIds: [], addedIds: [], removedIds: [] });
    expect(store.getRows().map((r) => r.id)).toEqual(["r-5"]);
  });

  it("replaceCurrent adopta filas externas sin tocar la línea base", () => {
    const store = make();
    store.replaceCurrent([
      { id: "r-1", name: "x", qty: 1 },
      { id: "r-4", name: "d", qty: 4 },
    ]);
    expect(store.getDiff()).toEqual({ dirtyIds: ["r-1"], addedIds: ["r-4"], removedIds: ["r-2", "r-3"] });
    expect(store.getRow("r-4")?.name).toBe("d");
  });

  it("patch devuelve un cambio por campo y notifica una sola vez", () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    const changes = store.patch("r-1", { name: "x", qty: 10 });
    expect(changes).toHaveLength(2);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getRow("r-1")).toEqual({ id: "r-1", name: "x", qty: 10 });
    expect(store.patch("r-1", { name: "x" })).toEqual([]);
    expect(store.patch("nope", { name: "x" })).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribe se llama una vez por mutación y permite cancelar", () => {
    const store = make();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.edit("r-1", "name", "x");
    store.add({ id: "r-9", name: "n", qty: 9 });
    store.remove("r-9");
    store.reset(seed());
    expect(listener).toHaveBeenCalledTimes(4);
    off();
    store.edit("r-1", "name", "y");
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("getRows devuelve la misma referencia si no hubo mutación", () => {
    const store = make();
    expect(store.getRows()).toBe(store.getRows());
    const first = store.getRows();
    store.edit("r-1", "name", "x");
    expect(store.getRows()).not.toBe(first);
  });

  it("getBaseRow expone la fila base, que solo cambia con reset", () => {
    const store = make();
    const original = store.getBaseRow("r-1");
    store.edit("r-1", "name", "x");
    expect(store.getBaseRow("r-1")).toBe(original);
    store.replaceCurrent([{ id: "r-1", name: "externo", qty: 3 }]);
    expect(store.getBaseRow("r-1")).toBe(original);
    const next = { id: "r-1", name: "nuevo", qty: 4 };
    store.reset([next]);
    expect(store.getBaseRow("r-1")).toBe(next);
    expect(store.getBaseRow("no-existe")).toBeUndefined();
  });
});
