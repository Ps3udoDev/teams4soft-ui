// @vitest-environment node
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { DataGrid } from "./DataGrid";
import type { DataGridColumn } from "./DataGrid.types";

type Line = { id: string; policy: string; amount: number; due: string | null; method: number | null; paid: boolean; side: string };
const rows: Line[] = [{ id: "r-1", policy: "Pérez", amount: 10, due: null, method: null, paid: false, side: "D" }];
const columns: DataGridColumn<Line>[] = [
  { field: "policy", header: "Póliza", editable: true },
  { field: "amount", header: "Importe", type: "currency", editable: true },
  { field: "due", header: "Vence", type: "date", editable: true },
  { field: "method", header: "Forma", type: "select", options: [{ value: 1, label: "Uno" }], editable: true },
  { field: "paid", header: "Pagado", type: "checkbox", editable: true },
  { field: "side", header: "Lado", type: "radio", options: [{ value: "D", label: "D" }], editable: true },
];

describe("DataGrid en el servidor", () => {
  it("una grilla editable se renderiza sin avisos de React", () => {
    const error = vi.spyOn(console, "error");
    onTestFinished(() => error.mockRestore());
    const html = renderToString(<DataGrid columns={columns} defaultValue={rows} getRowId={row => row.id} />);
    expect(html).toContain("data-editable");
    expect(error).not.toHaveBeenCalled();
  });
});
