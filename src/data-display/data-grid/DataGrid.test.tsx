import * as React from "react";
import { describe, it, expect, vi, beforeAll, onTestFinished } from "vitest";
import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { DataGrid } from "./DataGrid";
import { buildPersistStorageKey } from "./persist";
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

  it("alinea filtros y skeletons con el orden visual de columnas fijas reordenadas", () => {
    const pinnedColumns: DataGridColumn<Premium>[] = [columns[0]!, columns[1]!, { ...columns[2]!, frozen: "left", width: 120 }];
    const { container, rerender } = render(<DataGrid columns={pinnedColumns} value={rows} getRowId={getRowId} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Vencimiento");
    const filterRow = container.querySelector('[data-slot="filterRow"]')!;
    const filterInputs = within(filterRow as HTMLElement).getAllByRole("textbox");
    expect(filterInputs[0]).toHaveAccessibleName("Filtrar Vencimiento");
    expect(filterInputs[1]).toHaveAccessibleName("Filtrar Póliza");
    expect(filterInputs[2]).toHaveAccessibleName("Filtrar Imp. cobrado");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveTextContent("29/10/2026");
    rerender(<DataGrid columns={pinnedColumns} value={[]} getRowId={getRowId} loading />);
    const skeletonRow = container.querySelector('tr[data-slot="skeleton"]')!;
    expect(within(skeletonRow as HTMLElement).getAllByRole("cell")[0]).toHaveStyle({ width: "120px" });
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

  it("conecta el filtro numérico con igualdad y limpiar restaura incluso celdas nulas", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const amountFilter = screen.getByRole("textbox", { name: "Filtrar Imp. cobrado" });
    await user.type(amountFilter, "1,250.50");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Pérez");
    await user.clear(amountFilter);
    expect(bodyRows()).toHaveLength(3);
    await user.type(amountFilter, "20");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Bravo");
    await user.clear(amountFilter);
    await user.type(amountFilter, "no-numérico");
    expect(bodyRows()).toHaveLength(3);
  });

  it("conecta DateField al filtro ISO al confirmar y permite limpiar", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const dateFilter = screen.getByRole("textbox", { name: "Filtrar Vencimiento" });
    await user.type(dateFilter, "28/10/2026");
    expect(bodyRows()).toHaveLength(3);
    await user.keyboard("{Enter}");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Bravo");
    await user.click(screen.getByRole("button", { name: "Limpiar fecha" }));
    expect(bodyRows()).toHaveLength(3);
    expect(dateFilter).toHaveValue("");
  });

  it("conecta opciones tipadas de select y clear a las filas", async () => {
    const user = userEvent.setup();
    type Payment = { id: string; description: string; method: number };
    const paymentColumns: DataGridColumn<Payment>[] = [
      { field: "description", header: "Descripción", filter: false },
      { field: "method", header: "Forma de pago", type: "select", options: [{ code: 1, name: "Efectivo" }, { code: 2, name: "Transferencia" }], getOptionValue: option => (option as { code: number }).code, getOptionLabel: option => (option as { name: string }).name },
    ];
    render(<DataGrid columns={paymentColumns} value={[{ id: "p-1", description: "Pago en caja", method: 1 }, { id: "p-2", description: "Pago bancario", method: 2 }]} getRowId={payment => payment.id} />);
    await user.type(screen.getByRole("combobox", { name: "Filtrar Forma de pago" }), "Transferencia");
    await user.click(await screen.findByRole("option", { name: "Transferencia" }));
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Pago bancario");
    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));
    expect(bodyRows()).toHaveLength(2);
  });

  it("el filtro checkbox distingue false de filtro vacío y usa messages", async () => {
    const user = userEvent.setup();
    type Entry = { id: string; title: string; active: boolean };
    const entryColumns: DataGridColumn<Entry>[] = [{ field: "title", header: "Registro", filter: false }, { field: "active", header: "Activo", type: "checkbox" }];
    render(<DataGrid columns={entryColumns} value={[{ id: "a", title: "Habilitado", active: true }, { id: "b", title: "Deshabilitado", active: false }]} getRowId={entry => entry.id} messages={{ yes: "Verdadero", no: "Falso" }} />);
    const filter = screen.getByRole("combobox", { name: "Filtrar Activo" });
    await user.type(filter, "Falso");
    await user.click(await screen.findByRole("option", { name: "Falso" }));
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Deshabilitado");
    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));
    expect(bodyRows()).toHaveLength(2);
    await user.type(filter, "Verdadero");
    await user.click(await screen.findByRole("option", { name: "Verdadero" }));
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Habilitado");
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
    expect(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" })).toBePartiallyChecked();
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
    expect(screen.getByRole("columnheader", { name: "Seleccionar fila" })).toBeInTheDocument();
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

  it.each(["columns", "date", "select"] as const)("cierra el portal %s al cargar y no lo reabre al terminar", async kind => {
    const user = userEvent.setup();
    const portalColumns: DataGridColumn<Premium>[] = [...columns, { field: "id", header: "Código", type: "select", options: [{ value: "r-1", label: "Registro uno" }] }];
    const { rerender } = render(<DataGrid columns={portalColumns} value={rows} getRowId={getRowId} />);
    if (kind === "columns") {
      await user.click(screen.getByRole("button", { name: "Columnas" }));
      expect(screen.getByRole("checkbox", { name: "Póliza" })).toBeInTheDocument();
    } else if (kind === "date") {
      await user.click(screen.getByRole("button", { name: "Abrir calendario" }));
      expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
    } else {
      await user.type(screen.getByRole("combobox", { name: "Filtrar Código" }), "Registro");
      expect(await screen.findByRole("listbox")).toBeInTheDocument();
    }
    rerender(<DataGrid columns={portalColumns} value={rows} getRowId={getRowId} loading />);
    expect(screen.queryByRole("checkbox", { name: "Póliza" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columnas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir calendario" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Filtrar Código" })).toBeDisabled();
    rerender(<DataGrid columns={portalColumns} value={rows} getRowId={getRowId} />);
    expect(screen.queryByRole("checkbox", { name: "Póliza" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("DataGrid: pulido de controles", () => {
  it("el filtro numérico conserva lo escrito aunque sea inválido o lleve comas", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const amountFilter = screen.getByRole("textbox", { name: "Filtrar Imp. cobrado" });
    await user.type(amountFilter, "1,250.50");
    expect(amountFilter).toHaveValue("1,250.50");
    expect(bodyRows()).toHaveLength(1);
    await user.clear(amountFilter);
    await user.type(amountFilter, "12a");
    expect(amountFilter).toHaveValue("12a");
    expect(bodyRows()).toHaveLength(3);
  });

  it("los filtros comparten la altura de --ui-grid-filter-height", () => {
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const textFilter = screen.getByRole("textbox", { name: "Filtrar Póliza" });
    expect(textFilter).toHaveAttribute("data-size", "md");
    expect(textFilter.closest("td")).toHaveClass("[--ui-control-height:var(--ui-grid-filter-height)]");
  });

  it("el paginador usa controles de la librería y unstyled los deja sin estilo", () => {
    const { unmount } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    expect(screen.getByRole("button", { name: "Página siguiente" })).toHaveClass("h-8", "w-8");
    expect(screen.getByRole("combobox", { name: "Filas por página" })).toHaveClass("h-8", "border");
    unmount();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} unstyled />);
    expect(screen.getByRole("button", { name: "Página siguiente" })).not.toHaveClass("h-8");
    expect(screen.getByRole("combobox", { name: "Filas por página" })).not.toHaveClass("border");
  });

  it("restaura persistKey después de hidratar, sin errores de hidratación", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const persisted = <DataGrid columns={columns} value={rows} getRowId={getRowId} persistKey="grid-ssr" />;
    const html = renderToString(persisted);
    const key = buildPersistStorageKey("grid-ssr", columns.map(column => column.field));
    localStorage.setItem(key, JSON.stringify({ policy: false, collectedAmount: true, dueDate: true }));
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);
    const recoverable = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    onTestFinished(async () => {
      await act(async () => { root?.unmount(); });
      host.remove();
      localStorage.clear();
      consoleError.mockRestore();
    });
    await act(async () => { root = hydrateRoot(host, persisted, { onRecoverableError: recoverable }); });
    expect(recoverable).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(within(host).queryByRole("columnheader", { name: /Póliza/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(key)).toContain('"policy":false');
  });
});

describe("DataGrid: orden por tipo", () => {
  type Item = { id: string; name: string | null; status: number | null; amount: number | null; due: string | null; active: boolean };
  const item = (id: number, patch: Partial<Item>): Item => ({ id: `i-${id}`, name: `n${id}`, status: 1, amount: 1, due: "2026-01-01", active: true, ...patch });
  const firstColumn = () => bodyRows().map(row => within(row).getAllByRole("cell")[0]!.textContent);
  const nameColumn: DataGridColumn<Item>[] = [{ field: "name", header: "Nombre" }];

  it.each([6, 12])("ordena texto con reglas del español y sin distinguir mayúsculas (%i filas)", async (count) => {
    const user = userEvent.setup();
    const names = ["Zeta", "Álvarez", "beto", "Ñandú", "Oscar", "Nube"];
    const items = Array.from({ length: count }, (_, index) => item(index, { name: names[index % names.length]! }));
    render(<DataGrid columns={nameColumn} value={items} getRowId={row => row.id} pagination={false} />);
    const sort = screen.getByRole("button", { name: "Ordenar por Nombre" });
    await user.click(sort);
    expect([...new Set(firstColumn())]).toEqual(["Álvarez", "beto", "Nube", "Ñandú", "Oscar", "Zeta"]);
    await user.click(sort);
    expect([...new Set(firstColumn())]).toEqual(["Zeta", "Oscar", "Ñandú", "Nube", "beto", "Álvarez"]);
  });

  it("ordena los números dentro del texto por su valor", async () => {
    const user = userEvent.setup();
    const items = ["Póliza 10", "Póliza 2", "Póliza 1"].map((name, index) => item(index, { name }));
    render(<DataGrid columns={nameColumn} value={items} getRowId={row => row.id} />);
    await user.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    expect(firstColumn()).toEqual(["Póliza 1", "Póliza 2", "Póliza 10"]);
  });

  it("ordena select y radio por la etiqueta visible", async () => {
    const user = userEvent.setup();
    const options = [{ value: 1, label: "Zeta" }, { value: 2, label: "Alfa" }, { value: 3, label: "Medio" }];
    const items = [1, 2, 3].map(status => item(status, { status }));
    render(<DataGrid columns={[{ field: "status", header: "Estado", type: "select", options }]} value={items} getRowId={row => row.id} />);
    await user.click(screen.getByRole("button", { name: "Ordenar por Estado" }));
    expect(firstColumn()).toEqual(["Alfa", "Medio", "Zeta"]);
  });

  it.each<[string, DataGridColumn<Item>, Partial<Item>[], string[], string[]]>([
    ["currency", { field: "amount", header: "Campo", type: "currency" }, [{ amount: 5 }, { amount: null }, { amount: -2 }, { amount: Number.NaN }], ["-$2.00", "$5.00", "", ""], ["$5.00", "-$2.00", "", ""]],
    ["date", { field: "due", header: "Campo", type: "date" }, [{ due: "2026-03-01" }, { due: null }, { due: "2025-12-31" }, { due: "no-es-fecha" }], ["31/12/2025", "01/03/2026", "", ""], ["01/03/2026", "31/12/2025", "", ""]],
    ["text", { field: "name", header: "Campo" }, [{ name: "beta" }, { name: null }, { name: "alfa" }, { name: "" }], ["alfa", "beta", "", ""], ["beta", "alfa", "", ""]],
  ])("deja las celdas vacías al final en ambas direcciones (%s)", async (_type, column, patches, ascending, descending) => {
    const user = userEvent.setup();
    render(<DataGrid columns={[column]} value={patches.map((patch, index) => item(index, patch))} getRowId={row => row.id} />);
    const sort = screen.getByRole("button", { name: "Ordenar por Campo" });
    await user.click(sort);
    expect(firstColumn()).toEqual(ascending);
    await user.click(sort);
    expect(firstColumn()).toEqual(descending);
  });

  it("conserva 0 y false como valores, y entrega a la celda el valor original", async () => {
    const user = userEvent.setup();
    const render_ = vi.fn(({ value }: { value: unknown }) => String(value));
    const items = [item(1, { amount: 3, active: true }), item(2, { amount: 0, active: false }), item(3, { amount: null, active: true })];
    render(<DataGrid columns={[{ field: "amount", header: "Monto", type: "custom", render: render_ }, { field: "active", header: "Activo", type: "checkbox" }]} value={items} getRowId={row => row.id} />);
    expect(firstColumn()).toEqual(["3", "0", "null"]);
    await user.click(screen.getByRole("button", { name: "Ordenar por Activo" }));
    expect(firstColumn()).toEqual(["0", "3", "null"]);
  });
});

describe("DataGrid: toolbar y columnas", () => {
  it("limpia el filtro de una columna al ocultarla desde el toggler", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "perez");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(bodyRows()).toHaveLength(3);
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(screen.getByRole("textbox", { name: "Filtrar Póliza" })).toHaveValue("");
    expect(bodyRows()).toHaveLength(3);
  });

  it("limpia el filtro cuando la página oculta la columna con columnVisibility", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} columnVisibility={{ policy: true, collectedAmount: true, dueDate: true }} />);
    await user.type(screen.getByRole("textbox", { name: "Filtrar Póliza" }), "perez");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    rerender(<DataGrid columns={columns} value={rows} getRowId={getRowId} columnVisibility={{ policy: false, collectedAmount: true, dueDate: true }} />);
    expect(bodyRows()).toHaveLength(3);
  });

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
