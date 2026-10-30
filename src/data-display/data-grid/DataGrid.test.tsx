import * as React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid } from "./DataGrid";
import type { DataGridColumn, DataGridHandle } from "./DataGrid.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});

type Premium = { id: string; policy: string; collectedAmount: number | null; dueDate: string | null };
const rows: Premium[] = [
  { id: "r-1", policy: "Pérez", collectedAmount: 1250.5, dueDate: "2026-10-29" },
  { id: "r-2", policy: "Bravo", collectedAmount: 20, dueDate: "2026-10-28" },
  { id: "r-3", policy: "Alfa", collectedAmount: null, dueDate: null },
];
const columns: DataGridColumn<Premium>[] = [
  { field: "policy", header: "Póliza" },
  { field: "collectedAmount", header: "Imp. cobrado", type: "currency" },
  { field: "dueDate", header: "Vencimiento", type: "date" },
];
const getRowId = (row: Premium) => row.id;
const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("row");

describe("DataGrid: tabla de consulta", () => {
  it("renderiza tabla semántica, formato y orden", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText("$1,250.50").closest("td")).toHaveAttribute("data-align", "right");
    const sort = screen.getByRole("button", { name: "Ordenar por Imp. cobrado" });
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "descending");
  });

  it("respeta initialSort, frozen, densidad, clases y eventos de fila por identidad", async () => {
    const onRowClick = vi.fn();
    const onRowDoubleClick = vi.fn();
    const { container } = render(<DataGrid columns={[{ ...columns[0]!, frozen: "left", sortable: false }, ...columns.slice(1)]} value={rows} getRowId={getRowId} initialSort={{ field: "dueDate", direction: "desc" }} density="compact" onRowClick={onRowClick} onRowDoubleClick={onRowDoubleClick} classNames={{ row: "body-row" }} getRowClassName={r => r.collectedAmount === null ? "pending" : undefined} />);
    expect(container.firstChild).toHaveAttribute("data-density", "compact");
    expect(screen.queryByRole("button", { name: "Ordenar por Póliza" })).not.toBeInTheDocument();
    expect(screen.getByText("Vencimiento").closest("th")).toHaveAttribute("aria-sort", "descending");
    const cell = screen.getByText("Pérez").closest("td")!;
    expect(cell).toHaveAttribute("data-frozen", "left");
    expect(cell).toHaveStyle({ position: "sticky" });
    fireEvent.click(cell);
    expect(onRowClick).toHaveBeenCalledWith(rows[0], expect.anything());
    fireEvent.doubleClick(cell);
    expect(onRowDoubleClick).toHaveBeenCalledWith(rows[0], expect.anything());
    expect(screen.getByText("Alfa").closest("tr")).toHaveClass("pending", "body-row");
  });

  it("render y tipos propios reciben contexto y sus controles no activan la fila", async () => {
    const click = vi.fn();
    const renderCell = vi.fn(ctx => <button>Acción {ctx.rowId}</button>);
    const { rerender } = render(<DataGrid columns={[{ field: "policy", header: "Acción", type: "custom", render: renderCell }]} value={rows} getRowId={getRowId} onRowClick={click} />);
    expect(renderCell).toHaveBeenCalledWith(expect.objectContaining({ row: rows[0], value: "Pérez", rowId: "r-1" }));
    fireEvent.click(screen.getByText("Acción r-1"));
    expect(click).not.toHaveBeenCalled();
    rerender(<DataGrid columns={[{ field: "policy", header: "Estado", type: "status" }]} value={rows} getRowId={getRowId} cellTypes={{ status: ({ rowId }) => <span>Estado {rowId}</span> }} />);
    expect(screen.getByText("Estado r-1")).toBeInTheDocument();
  });

  it("redimensiona con mínimo y elimina estilos base con unstyled", () => {
    const { container, rerender } = render(<DataGrid columns={[{ ...columns[0]!, width: 120, minWidth: 100, resizable: true }]} value={rows} getRowId={getRowId} />);
    const separator = screen.getByRole("separator");
    const header = separator.closest("th")!;
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.mouseDown(separator, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 150 });
    fireEvent.mouseUp(document, { clientX: 150 });
    expect(header).toHaveStyle({ width: "170px" });
    fireEvent.mouseDown(separator, { clientX: 150 });
    fireEvent.mouseMove(document, { clientX: 0 });
    fireEvent.mouseUp(document, { clientX: 0 });
    expect(header).toHaveStyle({ width: "100px" });
    rerender(<DataGrid columns={columns} value={rows} getRowId={getRowId} unstyled columnToggler={false} />);
    expect(container.firstChild).not.toHaveClass("relative");
    expect(screen.getByRole("table")).not.toHaveClass("w-full");
  });

  it("avisa una vez por id duplicado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<DataGrid columns={columns} value={rows} getRowId={() => "repetido"} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("repetido"));
    warn.mockRestore();
  });

  it("acumula anchos CSS en columnas fijas y mantiene el orden inicial editable", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[{ ...columns[0]!, width: "240px", frozen: "left" }, { ...columns[1]!, frozen: "left" }, columns[2]!]} value={rows.slice(0, 2)} getRowId={getRowId} initialSort={{ field: "dueDate", direction: "desc" }} />);
    expect(bodyRows()[0]).toHaveTextContent("Pérez");
    expect(screen.getByText("$1,250.50").closest("td")).toHaveStyle({ left: "240px" });
    await user.click(screen.getByRole("button", { name: "Ordenar por Vencimiento" }));
    await user.click(screen.getByRole("button", { name: "Ordenar por Vencimiento" }));
    expect(bodyRows()[0]).toHaveTextContent("Bravo");
  });
});

describe("DataGrid: filtros y paginación", () => {
  it("filtra sin diacríticos con debounce, conserva orden y muestra noResults", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} initialSort={{ field: "policy", direction: "asc" }} />);
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "perez");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    expect(screen.getByText("Pérez")).toBeInTheDocument();
    expect(screen.getByText("Póliza").closest("th")).toHaveAttribute("aria-sort", "ascending");
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "zz");
    expect(await screen.findByText("Sin resultados para los filtros aplicados")).toBeInTheDocument();
  });

  it("omite filtros deshabilitados y custom", () => {
    render(<DataGrid columns={[{ ...columns[0]!, filter: false }, { ...columns[1]!, type: "custom" }]} value={rows} getRowId={getRowId} />);
    expect(screen.queryByLabelText(/Filtrar/)).not.toBeInTheDocument();
  });

  const manyRows = Array.from({ length: 25 }, (_, i) => ({ ...rows[0]!, id: `r-${i + 1}`, policy: `Póliza ${i + 1}` }));
  it("pagina, cambia tamaño, acota al filtrar y al reemplazar datos", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataGrid columns={columns} value={manyRows} getRowId={getRowId} />);
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 al 10 de 25 registros")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByText("Póliza 11")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Última página" }));
    expect(screen.getByText("Mostrando 21 al 25 de 25 registros")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "Póliza 25");
    await waitFor(() => expect(screen.getByText("Página 1 de 1")).toBeInTheDocument());
    await user.clear(screen.getByRole("textbox", { name: "Filtrar Póliza" }));
    await waitFor(() => expect(screen.getByText("Página 1 de 3")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Última página" }));
    rerender(<DataGrid columns={columns} value={manyRows.slice(0, 5)} getRowId={getRowId} />);
    await waitFor(() => expect(screen.getByText("Página 1 de 1")).toBeInTheDocument());
    rerender(<DataGrid columns={columns} value={manyRows} getRowId={getRowId} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Filas por página" }), "25");
    expect(bodyRows()).toHaveLength(25);
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
  });

  it("sin paginación muestra todo y vacío mantiene página 1", () => {
    const { rerender } = render(<DataGrid columns={columns} value={manyRows} getRowId={getRowId} pagination={false} />);
    expect(bodyRows()).toHaveLength(25);
    expect(screen.queryByText(/Página 1/)).not.toBeInTheDocument();
    rerender(<DataGrid columns={columns} value={[]} getRowId={getRowId} />);
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 0 al 0 de 0 registros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
  });
});

describe("DataGrid: selección y carga", () => {
  it("selecciona por id, preserva ocultos y expone getData", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const ref = React.createRef<DataGridHandle<Premium>>();
    render(<DataGrid ref={ref} columns={columns} value={rows} getRowId={getRowId} selectionMode="multiple" onSelectionChange={change} />);
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[0]!);
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[1]!);
    expect(change).toHaveBeenLastCalledWith(["r-1", "r-2"]);
    expect(ref.current?.getData()).toEqual({ rows, selectedIds: ["r-1", "r-2"] });
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "Bravo");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" }));
    expect(ref.current?.getData().selectedIds).toEqual(["r-1"]);
    await user.clear(screen.getByRole("textbox", { name: "Filtrar Póliza" }));
    await waitFor(() => expect(bodyRows()).toHaveLength(3));
    expect(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[0]).toBeChecked();
  });

  it("seleccionar todo solo afecta la página visible", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Premium>>();
    render(<DataGrid ref={ref} columns={columns} value={rows} getRowId={getRowId} selectionMode="multiple" pagination={{ pageSize: 2 }} />);
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" }));
    expect(ref.current?.getData().selectedIds).toEqual(["r-1", "r-2"]);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByRole("checkbox", { name: "Seleccionar fila" })).not.toBeChecked();
  });

  it("controlado espera al padre; single reemplaza selección al pulsar fila", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} selectionMode="multiple" selection={[]} onSelectionChange={change} />);
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[0]!);
    expect(change).toHaveBeenCalledWith(["r-1"]);
    expect(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[0]).not.toBeChecked();
    rerender(<DataGrid columns={columns} value={rows} getRowId={getRowId} selectionMode="single" onSelectionChange={change} />);
    await user.click(screen.getAllByRole("radio")[0]!);
    await user.click(screen.getByText("Bravo"));
    expect(change).toHaveBeenLastCalledWith(["r-2"]);
    expect(screen.getAllByRole("radio")[1]).toBeChecked();
    expect(screen.getByText("Bravo").closest("tr")).toHaveAttribute("aria-selected", "true");
  });

  it("muestra cinco skeletons, conserva filas al recargar y personaliza vacío", () => {
    const { container, rerender } = render(<DataGrid columns={columns} value={[]} getRowId={getRowId} loading />);
    expect(container.querySelectorAll('tr[data-slot="skeleton"]')).toHaveLength(5);
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    rerender(<DataGrid columns={columns} value={rows} getRowId={getRowId} loading />);
    expect(bodyRows()).toHaveLength(3);
    expect(container.querySelector('[data-slot="overlay"]')).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    rerender(<DataGrid columns={columns} value={[]} getRowId={getRowId} emptyState={{ hint: "Agregue una fila" }} />);
    expect(screen.getByText("Sin registros")).toBeInTheDocument();
    expect(screen.getByText("Agregue una fila")).toBeInTheDocument();
    rerender(<DataGrid columns={columns} value={[]} getRowId={getRowId} emptyState={{ title: "Sin pólizas" }} />);
    expect(screen.getByText("Sin pólizas")).toBeInTheDocument();
  });
});

describe("DataGrid: toolbar y columnas", () => {
  it("oculta columnas y omite no ocultables del menú", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[{ ...columns[0]!, hideable: false }, ...columns.slice(1)]} value={rows} getRowId={getRowId} toolbar={<button>Exportar</button>} />);
    expect(screen.getByText("Exportar").closest('[data-slot="toolbar"]')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    expect(screen.queryByRole("checkbox", { name: "Póliza" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Imp. cobrado" }));
    expect(screen.queryByRole("columnheader", { name: /Imp. cobrado/ })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Póliza/ })).toBeInTheDocument();
  });

  it("persiste con persistKey al remontar y permite omitir toggler", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} persistKey="grid-toggles-integration" />);
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    unmount();
    const { rerender } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} persistKey="grid-toggles-integration" />);
    expect(screen.queryByRole("columnheader", { name: /Póliza/ })).not.toBeInTheDocument();
    rerender(<DataGrid columns={columns} value={rows} getRowId={getRowId} columnToggler={false} />);
    expect(screen.queryByRole("button", { name: "Columnas" })).not.toBeInTheDocument();
    localStorage.clear();
  });

  it("unstyled alcanza celdas de lectura y respeta estilos por slot", () => {
    const { container } = render(<DataGrid columns={[...columns, { field: "id", header: "Activo", type: "checkbox" }]} value={rows} getRowId={getRowId} unstyled className="grid-root" classNames={{ root: "root-slot", cell: "cell-slot" }} style={{ padding: 8 }} styles={{ root: { margin: 4, padding: 3 }, cell: { color: "red" } }} />);
    expect(container.firstChild).toHaveClass("grid-root", "root-slot");
    expect(container.firstChild).toHaveStyle({ margin: "4px", padding: "8px" });
    expect(screen.getByText("Pérez")).not.toHaveClass("truncate");
    expect(screen.getByText("Pérez").closest("td")).toHaveClass("cell-slot");
    expect(screen.getByText("Pérez").closest("td")).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(screen.getAllByRole("checkbox", { name: "Activo" })[0]).not.toHaveClass("size-4");
  });
});
