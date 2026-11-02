import { describe, expect, it } from "vitest";
import type { DataGridColumn, DataGridColumnType } from "../DataGrid.types";
import { filterOperatorsFor, matchesFilter, normalizeText, resolveFilterKind } from "./filter-fns";

type Row = { x: unknown };
const col = (props: Partial<DataGridColumn<Row>> = {}): DataGridColumn<Row> => ({ field: "x", header: "X", ...props });

describe("resolveFilterKind", () => {
  it.each<[DataGridColumnType | undefined, string | null]>([
    [undefined, "text"], ["text", "text"], ["number", "number"], ["currency", "number"],
    ["percent", "number"], ["date", "date"], ["select", "select"], ["radio", "select"],
    ["checkbox", "select"], ["lookup", "text"], ["custom", null],
  ])("resuelve %s como %s", (type, expected) => {
    expect(resolveFilterKind(col({ type }))).toBe(expected);
  });
  it("respeta la exclusión y el tipo explícito", () => {
    expect(resolveFilterKind(col({ filter: false }))).toBeNull();
    expect(resolveFilterKind(col({ type: "number", filter: "select" }))).toBe("select");
    expect(resolveFilterKind(col({ type: "status" }))).toBeNull();
  });
});

describe("filterOperatorsFor", () => {
  it("define las condiciones según el tipo de filtro", () => {
    expect(filterOperatorsFor(col())).toEqual(["contains", "notContains", "startsWith", "endsWith", "equals", "notEquals"]);
    expect(filterOperatorsFor(col({ type: "number" }))).toEqual(["equals", "notEquals", "gt", "gte", "lt", "lte"]);
    expect(filterOperatorsFor(col({ type: "date" }))).toEqual(["equals", "notEquals", "before", "after"]);
    expect(filterOperatorsFor(col({ type: "select" }))).toEqual(["equals"]);
  });
  it("respeta filterOperators e ignora una lista vacía", () => {
    expect(filterOperatorsFor(col({ filterOperators: ["endsWith"] }))).toEqual(["endsWith"]);
    expect(filterOperatorsFor(col({ filterOperators: [] }))[0]).toBe("contains");
  });
});

describe("matchesFilter con condición", () => {
  it("aplica condiciones de texto sobre el texto normalizado", () => {
    expect(matchesFilter(col(), "Pérez López", "PEREZ", "startsWith")).toBe(true);
    expect(matchesFilter(col(), "Pérez López", "lopez", "startsWith")).toBe(false);
    expect(matchesFilter(col(), "Pérez López", "LÓPEZ", "endsWith")).toBe(true);
    expect(matchesFilter(col(), "Pérez", "perez", "equals")).toBe(true);
    expect(matchesFilter(col(), "Pérez López", "perez", "equals")).toBe(false);
    expect(matchesFilter(col(), "Pérez", "perez", "notEquals")).toBe(false);
    expect(matchesFilter(col(), "Pérez", "lopez", "notContains")).toBe(true);
    expect(matchesFilter(col(), null, "lopez", "notContains")).toBe(true);
  });
  it("compara números; una celda vacía solo cumple distinto de", () => {
    expect(matchesFilter(col({ type: "number" }), 10, 5, "gt")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), 5, 5, "gte")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), 5, 5, "lt")).toBe(false);
    expect(matchesFilter(col({ type: "number" }), 5, 5, "lte")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), 5, 6, "notEquals")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), null, 6, "notEquals")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), null, 6, "gt")).toBe(false);
  });
  it("compara fechas ISO; una celda inválida solo cumple distinto de", () => {
    expect(matchesFilter(col({ type: "date" }), "2026-10-01", "2026-10-15", "before")).toBe(true);
    expect(matchesFilter(col({ type: "date" }), "2026-10-15", "2026-10-15", "before")).toBe(false);
    expect(matchesFilter(col({ type: "date" }), "2026-10-30", "2026-10-15", "after")).toBe(true);
    expect(matchesFilter(col({ type: "date" }), "2026-10-30", "2026-10-15", "notEquals")).toBe(true);
    expect(matchesFilter(col({ type: "date" }), null, "2026-10-15", "after")).toBe(false);
    expect(matchesFilter(col({ type: "date" }), null, "2026-10-15", "notEquals")).toBe(true);
  });
});

describe("matchesFilter", () => {
  it("normaliza mayúsculas, tildes y espacios", () => {
    expect(normalizeText("  PÉREZ  ")).toBe("perez");
    expect(matchesFilter(col(), "Pérez", "perez")).toBe(true);
    expect(matchesFilter(col(), "Pérez", "PÉR")).toBe(true);
    expect(matchesFilter(col(), null, "a")).toBe(false);
  });
  it("usa el texto de etiqueta al filtrar opciones como texto", () => {
    expect(matchesFilter(col({ type: "select", filter: "text", options: [{ value: 1, label: "Crédito" }] }), 1, "credito")).toBe(true);
  });
  it("compara números por valor", () => {
    expect(matchesFilter(col({ type: "number" }), 1250.5, 1250.5)).toBe(true);
    expect(matchesFilter(col({ type: "number" }), 1250.5, "1250.5")).toBe(true);
    expect(matchesFilter(col({ type: "number" }), 1250.5, 1250)).toBe(false);
    expect(matchesFilter(col({ type: "number" }), null, 0)).toBe(false);
    expect(matchesFilter(col({ type: "number" }), "", 0)).toBe(false);
  });
  it("compara fechas ISO válidas y valores de select sin coerción", () => {
    expect(matchesFilter(col({ type: "date" }), "2026-10-29", "2026-10-29")).toBe(true);
    expect(matchesFilter(col({ type: "date" }), "2026-02-31", "2026-02-31")).toBe(false);
    expect(matchesFilter(col({ type: "select" }), 1, 1)).toBe(true);
    expect(matchesFilter(col({ type: "select" }), 1, "1")).toBe(false);
    expect(matchesFilter(col({ type: "checkbox" }), false, false)).toBe(true);
  });
  it("considera vacíos como ausencia de filtro", () => {
    for (const value of ["", null, undefined]) expect(matchesFilter(col(), null, value)).toBe(true);
    expect(matchesFilter(col({ filter: false }), "abc", "xyz")).toBe(true);
  });
});
