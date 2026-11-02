import { describe, expect, it } from "vitest";
import type { DataGridColumn } from "./DataGrid.types";
import { dataGridMessagesEs } from "./messages";
import { isEmptyValue, validateCell, validateRows } from "./validation";

type Row = { id: string; name: string; qty: number; active: boolean };

const col = (over: Partial<DataGridColumn<Row>> & { field: keyof Row & string }): DataGridColumn<Row> => ({
  header: over.field,
  ...over,
});

describe("isEmptyValue", () => {
  it("considera vacíos null, undefined, texto en blanco y arreglo vacío", () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue("")).toBe(true);
    expect(isEmptyValue("   ")).toBe(true);
    expect(isEmptyValue([])).toBe(true);
  });

  it("no considera vacíos el cero, false ni valores con contenido", () => {
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
    expect(isEmptyValue("a")).toBe(false);
    expect(isEmptyValue([1])).toBe(false);
  });
});

describe("validateCell", () => {
  const row: Row = { id: "r-1", name: "Ana", qty: 1, active: true };

  it("devuelve Requerido para required con null", () => {
    const c = col({ field: "name", required: true });
    expect(validateCell(c, null, { ...row, name: null as unknown as string }, dataGridMessagesEs)).toBe("Requerido");
  });

  it("no marca 0 como vacío en una columna required", () => {
    const c = col({ field: "qty", required: true });
    expect(validateCell(c, 0, { ...row, qty: 0 }, dataGridMessagesEs)).toBeNull();
  });

  it("devuelve el mensaje de validate cuando el valor es inválido", () => {
    const c = col({ field: "qty", validate: (v) => (Number(v) < 0 ? "Debe ser positivo" : null) });
    expect(validateCell(c, -1, { ...row, qty: -1 }, dataGridMessagesEs)).toBe("Debe ser positivo");
    expect(validateCell(c, 5, { ...row, qty: 5 }, dataGridMessagesEs)).toBeNull();
  });

  it("evalúa required antes que validate", () => {
    const validate = () => "inválido";
    const c = col({ field: "name", required: true, validate });
    expect(validateCell(c, "", row, dataGridMessagesEs)).toBe("Requerido");
  });

  it("devuelve null cuando no hay reglas", () => {
    expect(validateCell(col({ field: "name" }), "", row, dataGridMessagesEs)).toBeNull();
  });
});

describe("validateRows", () => {
  const rows: Row[] = [
    { id: "r-1", name: "", qty: -2, active: true },
    { id: "r-2", name: "Luis", qty: 3, active: false },
  ];
  const getRowId = (r: Row) => r.id;

  it("devuelve {} cuando no hay errores", () => {
    const columns = [col({ field: "name", required: true })];
    const valid: Row[] = [{ id: "r-2", name: "Luis", qty: 3, active: false }];
    expect(validateRows(valid, columns, getRowId, dataGridMessagesEs)).toEqual({});
  });

  it("agrupa errores por id de fila y campo", () => {
    const columns = [
      col({ field: "name", required: true, editable: true }),
      col({ field: "qty", editable: true, validate: (v) => (Number(v) < 0 ? "Debe ser positivo" : null) }),
    ];
    expect(validateRows(rows, columns, getRowId, dataGridMessagesEs)).toEqual({
      "r-1": { name: "Requerido", qty: "Debe ser positivo" },
    });
  });

  it("no valida columnas sin editable (por defecto no editable)", () => {
    const columns = [col({ field: "name", required: true })];
    expect(validateRows(rows, columns, getRowId, dataGridMessagesEs)).toEqual({});
  });

  it("omite columnas no editables para esa fila", () => {
    const columns = [
      col({ field: "name", required: true, editable: (r) => r.id !== "r-1" }),
    ];
    expect(validateRows(rows, columns, getRowId, dataGridMessagesEs)).toEqual({});
  });

  it("valida columnas editables cuando editable devuelve true", () => {
    const columns = [col({ field: "name", required: true, editable: true })];
    expect(validateRows(rows, columns, getRowId, dataGridMessagesEs)).toEqual({
      "r-1": { name: "Requerido" },
    });
  });
});
