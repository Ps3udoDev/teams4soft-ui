import { describe, expect, it } from "vitest";
import type { DataGridColumn, DataGridColumnType } from "./DataGrid.types";
import { formatCellText } from "./format";

type Row = { x: unknown };
const col = (props: Partial<DataGridColumn<Row>> = {}): DataGridColumn<Row> => ({ field: "x", header: "X", ...props });

describe("formatCellText", () => {
  it("formatea importes y porcentajes sin modificar el valor", () => {
    expect(formatCellText(col({ type: "number", fractionDigits: 2 }), 1250.5)).toBe("1,250.50");
    expect(formatCellText(col({ type: "currency" }), 1250.5)).toBe("$1,250.50");
    expect(formatCellText(col({ type: "currency", currencySymbol: "US$" }), 10)).toBe("US$10.00");
    expect(formatCellText(col({ type: "percent", fractionDigits: 2 }), 15)).toBe("15.00 %");
    expect(formatCellText(col({ type: "number", fractionDigits: 4 }), 17.5)).toBe("17.5000");
  });

  it("formatea fechas de calendario válidas sin convertir zona horaria", () => {
    expect(formatCellText(col({ type: "date" }), "2026-10-29")).toBe("29/10/2026");
    expect(formatCellText(col({ type: "date" }), "2026-02-31")).toBe("");
    expect(formatCellText(col({ type: "date" }), "no-es-fecha")).toBe("");
  });

  it("resuelve opciones comunes, opciones personalizadas y valores no encontrados", () => {
    const optionColumn: DataGridColumn<Row, { id: number; name: string }> = {
      field: "x", header: "X", type: "select", options: [{ id: 1, name: "Efectivo" }],
      getOptionValue: (option) => option.id, getOptionLabel: (option) => option.name,
    };
    // Las columnas con catálogos distintos coexisten en la API pública.
    const heterogeneousColumns: DataGridColumn<Row>[] = [col(), optionColumn];
    expect(heterogeneousColumns).toHaveLength(2);
    expect(formatCellText(optionColumn, 1)).toBe("Efectivo");
    expect(formatCellText(col({ type: "radio", options: [{ value: 2, label: "Crédito" }] }), 2)).toBe("Crédito");
    expect(formatCellText(col({ type: "select", options: [] }), 8)).toBe("8");
  });

  it("muestra etiquetas de booleanos", () => {
    expect(formatCellText(col({ type: "checkbox" }), true)).toBe("Sí");
    expect(formatCellText(col({ type: "checkbox" }), false)).toBe("No");
  });

  it("deja vacíos valores ausentes y no finitos para todos los tipos", () => {
    const types: DataGridColumnType[] = ["text", "number", "currency", "percent", "date", "select", "lookup", "checkbox", "radio", "custom"];
    for (const type of types) {
      for (const value of [null, undefined, Number.NaN, Infinity, new Date("invalid")]) {
        expect(formatCellText(col({ type }), value)).toBe("");
      }
    }
  });
});
