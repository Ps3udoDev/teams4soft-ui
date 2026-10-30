import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { actionsColumn, amountColumn, dateColumn, selectColumn, textColumn } from "./column-factories";
import type { DataGridCellContext } from "./DataGrid.types";
import { DataGrid } from "./DataGrid";

interface Premium { id: string; policy: string; amount: number; dueDate: string; method: number }

describe("factorías de columnas", () => {
  it("declara defaults de texto, moneda, fecha y select", () => {
    expect(textColumn<Premium>("policy", "Póliza")).toEqual({ field: "policy", header: "Póliza", type: "text" });
    expect(amountColumn<Premium>("amount", "Importe")).toMatchObject({ type: "currency", fractionDigits: 2, align: "right" });
    expect(dateColumn<Premium>("dueDate", "Fecha")).toMatchObject({ type: "date", width: 120 });
    const options = [{ id: 1, name: "Efectivo" }];
    expect(selectColumn<Premium, (typeof options)[number]>("method", "Método", { options, getOptionValue: (option) => option.id, getOptionLabel: (option) => option.name })).toMatchObject({ type: "select", options });
  });

  it("las opciones sobreescriben los defaults", () => {
    expect(textColumn<Premium>("policy", "Póliza", { type: "custom" }).type).toBe("custom");
    expect(amountColumn<Premium>("amount", "Importe", { fractionDigits: 4, align: "left" })).toMatchObject({ fractionDigits: 4, align: "left" });
    expect(dateColumn<Premium>("dueDate", "Fecha", { width: 200 }).width).toBe(200);
    expect(selectColumn<Premium, number>("method", "Método", { options: [1], type: "radio" }).type).toBe("radio");
  });

  it("acciones: defaults, contexto de la fila y predicado hidden", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const column = actionsColumn<Premium>([
      { label: "Ver", icon: <span aria-hidden>↗</span>, onClick },
      { label: "Eliminar", onClick, hidden: (row) => row.amount > 0 },
    ]);
    expect(column).toMatchObject({ field: "__actions", header: "Acciones", type: "custom", sortable: false, filter: false, hideable: false, frozen: "right" });
    const row: Premium = { id: "r-2", policy: "Segunda", amount: 10, dueDate: "2026-10-30", method: 1 };
    const context: DataGridCellContext<Premium> = { row, value: undefined, rowId: row.id, grid: { getData: () => ({ rows: [row], selectedIds: [] }) } };
    render(<>{column.render?.(context)}</>);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver" }));
    expect(onClick).toHaveBeenCalledWith(row, context);
    expect(actionsColumn<Premium>([], { frozen: "left", width: 80 })).toMatchObject({ frozen: "left", width: 80 });
  });

  it("las acciones reciben la fila correcta después de ordenar la tabla", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRowClick = vi.fn();
    const rows: Premium[] = [
      { id: "r-z", policy: "Zeta", amount: 10, dueDate: "2026-10-30", method: 1 },
      { id: "r-a", policy: "Alfa", amount: 20, dueDate: "2026-10-29", method: 1 },
    ];
    render(<DataGrid columns={[textColumn<Premium>("policy", "Póliza"), actionsColumn<Premium>([{ label: "Ver registro", onClick }])]} value={rows} getRowId={(row) => row.id} onRowClick={onRowClick} initialSort={{ field: "policy", direction: "asc" }} />);
    await user.click(screen.getAllByRole("button", { name: "Ver registro" })[0]!);
    expect(onClick).toHaveBeenLastCalledWith(rows[1], expect.objectContaining({ rowId: "r-a", row: rows[1] }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
