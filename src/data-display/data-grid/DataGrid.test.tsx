import * as React from "react";
import { describe, it, expect, vi, beforeAll, onTestFinished } from "vitest";
import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Dialog } from "../../overlays/dialog/Dialog";
import { DataGrid } from "./DataGrid";
import { buildPersistStorageKey } from "./persist";
import type { DataGridCellComponent, DataGridColumn, DataGridHandle } from "./DataGrid.types";

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
type User = ReturnType<typeof userEvent.setup>;
const filterButton = (header: string) => screen.getByRole("button", { name: new RegExp(`^(Filtrar|Filtro activo en) ${header}$`) });
const openFilter = async (user: User, header: string) => {
  await user.click(filterButton(header));
  return screen.findByRole("dialog", { name: `Filtrar ${header}` });
};
const applyFilter = async (user: User, header: string, value: string, operator?: string) => {
  const menu = await openFilter(user, header);
  if (operator) await user.selectOptions(within(menu).getByRole("combobox", { name: "Condición" }), operator);
  const input = within(menu).getByRole("textbox", { name: `Filtrar ${header}` });
  await user.clear(input);
  await user.type(input, value);
  await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
};
const clearFilter = async (user: User, header: string) => {
  const menu = await openFilter(user, header);
  await user.click(within(menu).getByRole("button", { name: "Limpiar" }));
};

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

  it("fija columnas a la derecha conservando data-frozen y offset físicos", () => {
    render(<DataGrid columns={[columns[0]!, { ...columns[1]!, frozen: "right", width: 100 }, { ...columns[2]!, frozen: "right", width: 120 }]} value={rows.slice(0, 1)} getRowId={getRowId} />);
    const amount = screen.getByText("$1,250.50").closest("td")!;
    expect(amount).toHaveAttribute("data-frozen", "right");
    expect(amount).toHaveStyle({ position: "sticky", right: "120px" });
    expect(screen.getByText("Vencimiento").closest("th")).toHaveStyle({ right: "0px" });
  });

  it("alinea encabezados y skeletons con el orden visual de columnas fijas reordenadas", () => {
    const pinnedColumns: DataGridColumn<Premium>[] = [columns[0]!, columns[1]!, { ...columns[2]!, frozen: "left", width: 120 }];
    const { container, rerender } = render(<DataGrid columns={pinnedColumns} value={rows} getRowId={getRowId} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Vencimiento");
    const headers = screen.getAllByRole("columnheader");
    expect(within(headers[0]!).getByRole("button", { name: "Filtrar Vencimiento" })).toBeInTheDocument();
    expect(within(headers[1]!).getByRole("button", { name: "Filtrar Póliza" })).toBeInTheDocument();
    expect(within(headers[2]!).getByRole("button", { name: "Filtrar Imp. cobrado" })).toBeInTheDocument();
    expect(within(bodyRows()[0]!).getAllByRole("cell")[0]).toHaveTextContent("29/10/2026");
    rerender(<DataGrid columns={pinnedColumns} value={[]} getRowId={getRowId} loading />);
    const skeletonRow = container.querySelector('tr[data-slot="skeleton"]')!;
    expect(within(skeletonRow as HTMLElement).getAllByRole("cell")[0]).toHaveStyle({ width: "120px" });
  });
});

describe("DataGrid: filtros y paginación", () => {
  it("filtra sin diacríticos, conserva orden y muestra noResults", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} initialSort={{ field: "policy", direction: "asc" }} />);
    await applyFilter(user, "Póliza", "perez");
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Pérez")).toBeInTheDocument();
    expect(screen.getByText("Póliza").closest("th")).toHaveAttribute("aria-sort", "ascending");
    await applyFilter(user, "Póliza", "zz");
    expect(await screen.findByText("Sin resultados para los filtros aplicados")).toBeInTheDocument();
  });

  it("omite filtros deshabilitados y custom", () => {
    render(<DataGrid columns={[{ ...columns[0]!, filter: false }, { ...columns[1]!, type: "custom" }]} value={rows} getRowId={getRowId} />);
    expect(screen.queryByLabelText(/Filtrar/)).not.toBeInTheDocument();
  });

  it("conecta el filtro numérico con igualdad y limpiar restaura incluso celdas nulas", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    await applyFilter(user, "Imp. cobrado", "1,250.50");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Pérez");
    await clearFilter(user, "Imp. cobrado");
    expect(bodyRows()).toHaveLength(3);
    await applyFilter(user, "Imp. cobrado", "20");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Bravo");
    await applyFilter(user, "Imp. cobrado", "no-numérico");
    expect(bodyRows()).toHaveLength(3);
  });

  it("conecta DateField al filtro ISO, aplica con Enter y permite limpiar", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const menu = await openFilter(user, "Vencimiento");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Vencimiento" }), "28/10/2026");
    expect(bodyRows()).toHaveLength(3);
    await user.keyboard("{Enter}");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Bravo");
    await clearFilter(user, "Vencimiento");
    expect(bodyRows()).toHaveLength(3);
    const reopened = await openFilter(user, "Vencimiento");
    expect(within(reopened).getByRole("textbox", { name: "Filtrar Vencimiento" })).toHaveValue("");
  });

  it("conecta opciones tipadas de select y clear a las filas", async () => {
    const user = userEvent.setup();
    type Payment = { id: string; description: string; method: number };
    const paymentColumns: DataGridColumn<Payment>[] = [
      { field: "description", header: "Descripción", filter: false },
      { field: "method", header: "Forma de pago", type: "select", options: [{ code: 1, name: "Efectivo" }, { code: 2, name: "Transferencia" }], getOptionValue: option => (option as { code: number }).code, getOptionLabel: option => (option as { name: string }).name },
    ];
    render(<DataGrid columns={paymentColumns} value={[{ id: "p-1", description: "Pago en caja", method: 1 }, { id: "p-2", description: "Pago bancario", method: 2 }]} getRowId={payment => payment.id} />);
    const menu = await openFilter(user, "Forma de pago");
    await user.type(within(menu).getByRole("combobox", { name: "Filtrar Forma de pago" }), "Transferencia");
    await user.click(await screen.findByRole("option", { name: "Transferencia" }));
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Pago bancario");
    await clearFilter(user, "Forma de pago");
    expect(bodyRows()).toHaveLength(2);
  });

  it("el filtro checkbox distingue false de filtro vacío y usa messages", async () => {
    const user = userEvent.setup();
    type Entry = { id: string; title: string; active: boolean };
    const entryColumns: DataGridColumn<Entry>[] = [{ field: "title", header: "Registro", filter: false }, { field: "active", header: "Activo", type: "checkbox" }];
    render(<DataGrid columns={entryColumns} value={[{ id: "a", title: "Habilitado", active: true }, { id: "b", title: "Deshabilitado", active: false }]} getRowId={entry => entry.id} messages={{ yes: "Verdadero", no: "Falso" }} />);
    let menu = await openFilter(user, "Activo");
    await user.type(within(menu).getByRole("combobox", { name: "Filtrar Activo" }), "Falso");
    await user.click(await screen.findByRole("option", { name: "Falso" }));
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("Deshabilitado");
    await clearFilter(user, "Activo");
    expect(bodyRows()).toHaveLength(2);
    menu = await openFilter(user, "Activo");
    await user.type(within(menu).getByRole("combobox", { name: "Filtrar Activo" }), "Verdadero");
    await user.click(await screen.findByRole("option", { name: "Verdadero" }));
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
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
    await applyFilter(user, "Póliza", "Póliza 25");
    await waitFor(() => expect(screen.getByText("Página 1 de 1")).toBeInTheDocument());
    await clearFilter(user, "Póliza");
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
    expect(ref.current?.getData()).toEqual({ rows, selectedIds: ["r-1", "r-2"], dirtyIds: [], addedIds: [], removedIds: [], errors: {}, isValid: true });
    await applyFilter(user, "Póliza", "Bravo");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" }));
    expect(ref.current?.getData().selectedIds).toEqual(["r-1"]);
    await clearFilter(user, "Póliza");
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
      await openFilter(user, "Vencimiento");
      await user.click(screen.getByRole("button", { name: "Abrir calendario" }));
      expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
    } else {
      await openFilter(user, "Código");
      await user.type(screen.getByRole("combobox", { name: "Filtrar Código" }), "Registro");
      expect(await screen.findByRole("listbox")).toBeInTheDocument();
    }
    rerender(<DataGrid columns={portalColumns} value={rows} getRowId={getRowId} loading />);
    expect(screen.queryByRole("checkbox", { name: "Póliza" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columnas" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(filterButton("Vencimiento")).toBeDisabled();
    expect(filterButton("Código")).toBeDisabled();
    rerender(<DataGrid columns={portalColumns} value={rows} getRowId={getRowId} />);
    expect(screen.queryByRole("checkbox", { name: "Póliza" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mes siguiente" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DataGrid: pulido de controles", () => {
  it("el filtro numérico interpreta comas e ignora texto inválido", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    await applyFilter(user, "Imp. cobrado", "1,250.50");
    expect(bodyRows()).toHaveLength(1);
    expect(filterButton("Imp. cobrado")).toHaveAttribute("data-active");
    await applyFilter(user, "Imp. cobrado", "12a");
    expect(bodyRows()).toHaveLength(3);
    expect(filterButton("Imp. cobrado")).not.toHaveAttribute("data-active");
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
    // React 18 avisa de useLayoutEffect aquí porque jsdom define document durante el render de servidor.
    consoleError.mockClear();
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

describe("DataGrid: menú de filtros", () => {
  const people: Premium[] = [
    { id: "a", policy: "Ana García", collectedAmount: 100, dueDate: "2026-10-01" },
    { id: "b", policy: "Luis Pérez", collectedAmount: 200, dueDate: "2026-10-15" },
    { id: "c", policy: "Ana Torres", collectedAmount: 300, dueDate: "2026-10-30" },
  ];
  const texts = () => bodyRows().map(row => within(row).getAllByRole("cell")[0]!.textContent);

  it("pone un icono en cada encabezado filtrable y ya no dibuja fila de filtros", () => {
    const { container } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    expect(container.querySelector('[data-slot="filterRow"]')).not.toBeInTheDocument();
    const button = within(screen.getAllByRole("columnheader")[0]!).getByRole("button", { name: "Filtrar Póliza" });
    expect(button).toHaveAttribute("data-slot", "filterButton");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("abre el menú al pulsar y enfoca el valor", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} />);
    const menu = await openFilter(user, "Póliza");
    expect(within(menu).getByRole("textbox", { name: "Filtrar Póliza" })).toHaveFocus();
  });

  it("ofrece condiciones de texto, con contiene por defecto", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Póliza");
    const select = within(menu).getByRole("combobox", { name: "Condición" });
    expect(select).toHaveValue("contains");
    expect(within(select).getAllByRole("option").map(option => option.textContent)).toEqual(["Contiene", "No contiene", "Empieza con", "Termina en", "Igual a", "Distinto de"]);
  });

  it.each([
    ["Empieza con", "ana", ["Ana García", "Ana Torres"]],
    ["Termina en", "perez", ["Luis Pérez"]],
    ["Igual a", "ana garcia", ["Ana García"]],
    ["Distinto de", "ana garcia", ["Luis Pérez", "Ana Torres"]],
    ["No contiene", "ana", ["Luis Pérez"]],
  ])("aplica %s en texto", async (operator, value, expected) => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    await applyFilter(user, "Póliza", value, operator);
    expect(texts()).toEqual(expected);
  });

  it("compara números con mayor, menor y distinto", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Imp. cobrado");
    expect(within(within(menu).getByRole("combobox", { name: "Condición" })).getAllByRole("option").map(option => option.textContent)).toEqual(["Igual a", "Distinto de", "Mayor que", "Mayor o igual que", "Menor que", "Menor o igual que"]);
    await user.keyboard("{Escape}");
    await applyFilter(user, "Imp. cobrado", "200", "Mayor que");
    expect(texts()).toEqual(["Ana Torres"]);
    await applyFilter(user, "Imp. cobrado", "200", "Menor o igual que");
    expect(texts()).toEqual(["Ana García", "Luis Pérez"]);
  });

  it("compara fechas con antes y después de", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Vencimiento");
    await user.selectOptions(within(menu).getByRole("combobox", { name: "Condición" }), "Después de");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Vencimiento" }), "15/10/2026");
    await user.keyboard("{Enter}");
    expect(texts()).toEqual(["Ana Torres"]);
  });

  it("elegir un día en el calendario no aplica hasta pulsar Aplicar", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Vencimiento");
    await user.click(within(menu).getByRole("button", { name: "Abrir calendario" }));
    const days = screen.getAllByRole("gridcell").filter(cell => !cell.querySelector("[disabled]") && cell.textContent === "15");
    await user.click(within(days[0]!).queryByRole("button") ?? days[0]!);
    expect(screen.getByRole("dialog", { name: "Filtrar Vencimiento" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
    await user.click(within(screen.getByRole("dialog", { name: "Filtrar Vencimiento" })).getByRole("button", { name: "Aplicar" }));
    expect(bodyRows()).toHaveLength(1);
  });

  it("una fecha inválida con Enter deja el menú abierto y no filtra", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Vencimiento");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Vencimiento" }), "99/99/2026{Enter}");
    expect(screen.getByRole("dialog", { name: "Filtrar Vencimiento" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
  });

  it("dentro de un Dialog, Escape cierra el menú y deja abierto el diálogo", async () => {
    const user = userEvent.setup();
    render(<Dialog open title="Buscar" onOpenChange={() => {}}><DataGrid columns={columns} value={people} getRowId={getRowId} /></Dialog>);
    await openFilter(user, "Póliza");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Filtrar Póliza" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Buscar" })).toBeInTheDocument();
    await applyFilter(user, "Póliza", "luis");
    expect(texts()).toEqual(["Luis Pérez"]);
  });

  it("su submit no envía un formulario de la página", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={onSubmit}><DataGrid columns={columns} value={people} getRowId={getRowId} /></form>);
    await applyFilter(user, "Póliza", "ana");
    expect(bodyRows()).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no aplica lo escrito si se cierra con Escape y devuelve el foco al icono", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Póliza");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Póliza" }), "zzz");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
    expect(filterButton("Póliza")).toHaveFocus();
    const reopened = await openFilter(user, "Póliza");
    expect(within(reopened).getByRole("textbox", { name: "Filtrar Póliza" })).toHaveValue("");
  });

  it("aplica con Enter, marca el icono y recuerda la condición al reabrir", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={columns} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Póliza");
    await user.selectOptions(within(menu).getByRole("combobox", { name: "Condición" }), "Empieza con");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Póliza" }), "luis{Enter}");
    expect(texts()).toEqual(["Luis Pérez"]);
    const active = screen.getByRole("button", { name: "Filtro activo en Póliza" });
    expect(active).toHaveAttribute("data-active");
    const reopened = await openFilter(user, "Póliza");
    expect(within(reopened).getByRole("combobox", { name: "Condición" })).toHaveValue("startsWith");
    expect(within(reopened).getByRole("textbox", { name: "Filtrar Póliza" })).toHaveValue("luis");
  });

  it("filterOperators limita las condiciones, la primera es la inicial y una sola oculta el selector", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataGrid columns={[{ ...columns[0]!, filterOperators: ["startsWith", "equals"] }]} value={people} getRowId={getRowId} />);
    const menu = await openFilter(user, "Póliza");
    const select = within(menu).getByRole("combobox", { name: "Condición" });
    expect(select).toHaveValue("startsWith");
    expect(within(select).getAllByRole("option")).toHaveLength(2);
    unmount();
    render(<DataGrid columns={[{ ...columns[0]!, filterOperators: ["equals"] }]} value={people} getRowId={getRowId} />);
    const single = await openFilter(user, "Póliza");
    expect(within(single).queryByRole("combobox", { name: "Condición" })).not.toBeInTheDocument();
  });

  it("select no muestra condiciones y messages y classNames personalizan el menú", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[{ ...columns[0]!, type: "select", options: [] }, columns[1]!]} value={people} getRowId={getRowId} classNames={{ filterButton: "mi-icono", filterMenu: "mi-menu" }} messages={{ filterApply: "Filtrar ya" }} />);
    expect(filterButton("Póliza")).toHaveClass("mi-icono");
    const menu = await openFilter(user, "Póliza");
    expect(menu).toHaveClass("mi-menu");
    expect(within(menu).queryByRole("combobox", { name: "Condición" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Filtrar ya" })).toBeInTheDocument();
  });

  it("unstyled deja el icono sin estilos base", () => {
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} unstyled />);
    expect(filterButton("Póliza")).not.toHaveClass("rounded-(--radius-ui-sm)");
  });
});

describe("DataGrid: casilla de seleccionar todo", () => {
  it("queda marcada, no indeterminada, con todo seleccionado y vuelve a indeterminada al desmarcar una fila", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<DataGrid columns={columns} value={rows} getRowId={getRowId} selectionMode="multiple" onSelectionChange={change} />);
    const all = screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" });
    await user.click(all);
    expect(all).toBeChecked();
    expect(all).not.toBePartiallyChecked();
    await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })[0]!);
    expect(all).toBePartiallyChecked();
    expect(change).toHaveBeenLastCalledWith(rows.slice(1).map(getRowId));
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
    await applyFilter(user, "Póliza", "perez");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(bodyRows()).toHaveLength(3);
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(filterButton("Póliza")).not.toHaveAttribute("data-active");
    expect(bodyRows()).toHaveLength(3);
  });

  it("limpia el filtro cuando la página oculta la columna con columnVisibility", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataGrid columns={columns} value={rows} getRowId={getRowId} columnVisibility={{ policy: true, collectedAmount: true, dueDate: true }} />);
    await applyFilter(user, "Póliza", "perez");
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

describe("DataGrid: celdas editables", () => {
  type Editable = { id: string; policy: string | null; collectedAmount: number | null; locked?: boolean };
  const editableRows: Editable[] = [
    { id: "r-1", policy: "Pérez", collectedAmount: 10 },
    { id: "r-2", policy: "Bravo", collectedAmount: 20 },
    { id: "r-3", policy: "Alfa", collectedAmount: 30 },
  ];
  const editableColumns: DataGridColumn<Editable>[] = [
    { field: "policy", header: "Póliza", editable: true },
    { field: "collectedAmount", header: "Imp. cobrado", type: "currency", editable: true },
  ];
  const rowId = (row: Editable) => row.id;
  const policyInput = (index: number) => within(bodyRows()[index]!).getByRole("textbox", { name: "Póliza" }) as HTMLInputElement;
  const amountInput = (index: number) => within(bodyRows()[index]!).getByRole("textbox", { name: "Imp. cobrado" }) as HTMLInputElement;
  const retype = async (user: User, input: HTMLInputElement, text: string) => {
    await user.clear(input);
    await user.type(input, text);
  };

  it("editar con orden activo modifica la fila correcta (spec §8)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={editableColumns} value={editableRows} getRowId={rowId} onChange={onChange} />);
    const sort = screen.getByRole("button", { name: "Ordenar por Imp. cobrado" });
    await user.click(sort);
    await user.click(sort);
    expect(sort.closest("th")).toHaveAttribute("aria-sort", "descending");
    expect(policyInput(0)).toHaveValue("Alfa");
    await retype(user, amountInput(0), "5");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    const [data, change] = onChange.mock.calls[0]!;
    expect(change).toEqual({ type: "edit", rowId: "r-3", field: "collectedAmount", prev: 30, next: 5 });
    expect(data.rows.find((row: Editable) => row.id === "r-3").collectedAmount).toBe(5);
    expect(data.rows.find((row: Editable) => row.id === "r-1").collectedAmount).toBe(10);
    expect(data.dirtyIds).toEqual(["r-3"]);
  });

  it("confirmar re-renderiza una sola fila y teclear ninguna (spec §12)", async () => {
    const user = userEvent.setup();
    const renders = new Map<string, number>();
    const memoColumns: DataGridColumn<Editable>[] = [
      { field: "collectedAmount", header: "Imp. cobrado", type: "currency", editable: true },
      { field: "policy", header: "Marca", type: "custom", render: ({ rowId: id }) => { renders.set(id, (renders.get(id) ?? 0) + 1); return id; } },
    ];
    render(<DataGrid columns={memoColumns} defaultValue={editableRows} getRowId={rowId} />);
    renders.clear();
    await retype(user, amountInput(1), "999");
    expect(renders.size).toBe(0);
    await user.tab();
    expect(renders.get("r-2")).toBe(1);
    expect(renders.has("r-1")).toBe(false);
    expect(renders.has("r-3")).toBe(false);
  });

  it("un padre controlado que devuelve data.rows no entra en bucle y solo re-renderiza la fila editada", async () => {
    const user = userEvent.setup();
    const renders = new Map<string, number>();
    const onChange = vi.fn();
    const memoColumns: DataGridColumn<Editable>[] = [
      { field: "collectedAmount", header: "Imp. cobrado", type: "currency", editable: true },
      { field: "policy", header: "Marca", type: "custom", render: ({ rowId: id }) => { renders.set(id, (renders.get(id) ?? 0) + 1); return id; } },
    ];
    function Parent() {
      const [current, setCurrent] = React.useState(editableRows);
      return <DataGrid columns={memoColumns} value={current} getRowId={rowId} onChange={(data, change) => { onChange(data, change); setCurrent(data.rows); }} />;
    }
    render(<Parent />);
    renders.clear();
    await retype(user, amountInput(1), "999");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(renders.get("r-2")).toBe(1);
    expect(renders.has("r-1")).toBe(false);
    expect(amountInput(1)).toHaveValue("$999.00");
  });

  it("adopta un value externo sin emitir onChange y conserva la base del diff", () => {
    const onChange = vi.fn();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const { rerender } = render(<DataGrid ref={ref} columns={editableColumns} value={editableRows} getRowId={rowId} onChange={onChange} />);
    const next = editableRows.map(row => row.id === "r-2" ? { ...row, policy: "Externo" } : row);
    rerender(<DataGrid ref={ref} columns={editableColumns} value={next} getRowId={rowId} onChange={onChange} />);
    expect(policyInput(1)).toHaveValue("Externo");
    expect(onChange).not.toHaveBeenCalled();
    expect(ref.current?.getData().rows[1]?.policy).toBe("Externo");
    expect(ref.current?.getData().dirtyIds).toEqual(["r-2"]);
  });

  it("teclear en una celda text no emite hasta el blur y Enter también confirma", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await retype(user, policyInput(0), "Nuevo");
    expect(onChange).not.toHaveBeenCalled();
    expect(policyInput(0).closest("td")).toHaveAttribute("data-draft-dirty");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![1]).toEqual({ type: "edit", rowId: "r-1", field: "policy", prev: "Pérez", next: "Nuevo" });
    expect(policyInput(0).closest("td")).not.toHaveAttribute("data-draft-dirty");
    await retype(user, policyInput(1), "Otro");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]![1]).toMatchObject({ rowId: "r-2", next: "Otro" });
  });

  it("recorrer celdas con Tab sin teclear no cambia los valores", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const precise = [{ id: "r-1", policy: null, collectedAmount: 1.23456 }];
    const ref = React.createRef<DataGridHandle<Editable>>();
    render(<DataGrid ref={ref} columns={editableColumns} defaultValue={precise} getRowId={rowId} onChange={onChange} />);
    await user.click(policyInput(0));
    await user.tab();
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(ref.current?.getData().rows[0]).toEqual(precise[0]);
    expect(ref.current?.getData().dirtyIds).toEqual([]);
  });

  it("vaciar una celda text guarda null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await user.clear(policyInput(0));
    await user.tab();
    expect(onChange.mock.calls[0]![1]).toMatchObject({ prev: "Pérez", next: null });
  });

  it.each([
    ["text", () => policyInput(0), "Pérez", "Otro"],
    ["number", () => amountInput(0), "10.00", "77"],
  ] as const)("Esc revierte el borrador de una celda %s sin emitir y devuelve el foco al editor", async (_kind, input, original, typed) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await retype(user, input(), typed);
    expect(input().closest("td")).toHaveAttribute("data-draft-dirty");
    await user.keyboard("{Escape}");
    expect(input()).toHaveValue(original);
    expect(input()).toHaveFocus();
    expect(input().closest("td")).not.toHaveAttribute("data-draft-dirty");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Esc tras pegar en una celda numérica también revierte", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await user.click(amountInput(0));
    await user.paste("55");
    expect(amountInput(0).closest("td")).toHaveAttribute("data-draft-dirty");
    await user.keyboard("{Escape}");
    expect(amountInput(0)).toHaveValue("10.00");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marca data-dirty en celda y fila, y lo quita al volver al valor original", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} />);
    await retype(user, policyInput(0), "Nuevo");
    await user.tab();
    expect(policyInput(0).closest("td")).toHaveAttribute("data-dirty");
    expect(amountInput(0).closest("td")).not.toHaveAttribute("data-dirty");
    expect(bodyRows()[0]).toHaveAttribute("data-dirty");
    expect(bodyRows()[1]).not.toHaveAttribute("data-dirty");
    await retype(user, policyInput(0), "Pérez");
    await user.tab();
    expect(policyInput(0).closest("td")).not.toHaveAttribute("data-dirty");
    expect(bodyRows()[0]).not.toHaveAttribute("data-dirty");
  });

  it("valida al confirmar, conserva el editor y el foco, y muestra el error en un tooltip", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const onChange = vi.fn();
    const required: DataGridColumn<Editable>[] = [{ ...editableColumns[0]!, required: true }, editableColumns[1]!];
    render(<DataGrid ref={ref} columns={required} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    const input = policyInput(0);
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(policyInput(0)).toBe(input);
    expect(input).toHaveFocus();
    expect(input.closest("td")).toHaveAttribute("data-invalid");
    expect(bodyRows()[0]).toHaveAttribute("data-invalid");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onChange.mock.calls[0]![0]).toMatchObject({ errors: { "r-1": { policy: "Requerido" } }, isValid: false });
    await user.tab();
    await user.tab({ shift: true });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Requerido");
    await retype(user, input, "Corregido");
    await user.tab();
    expect(input.closest("td")).not.toHaveAttribute("data-invalid");
    expect(bodyRows()[0]).not.toHaveAttribute("data-invalid");
    expect(ref.current?.getData()).toMatchObject({ errors: {}, isValid: true });
  });

  it("ignora el teclado que llega desde un portal", async () => {
    const user = userEvent.setup();
    const required: DataGridColumn<Editable>[] = [{ ...editableColumns[0]!, required: true }];
    render(<DataGrid columns={required} defaultValue={editableRows} getRowId={rowId} />);
    await user.clear(policyInput(0));
    await user.tab();
    await user.tab({ shift: true });
    const tooltip = await screen.findByRole("tooltip");
    await user.keyboard("x");
    expect(policyInput(0)).toHaveValue("x");
    fireEvent.keyDown(tooltip, { key: "Escape" });
    expect(policyInput(0)).toHaveValue("x");
    expect(policyInput(0).closest("td")).toHaveAttribute("data-draft-dirty");
  });

  it("column.onCommit recibe fila, valor, prev y el handle, cuya identidad es estable", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const grids = new Set<unknown>();
    const withCommit: DataGridColumn<Editable>[] = [
      { ...editableColumns[0]!, onCommit },
      { field: "collectedAmount", header: "Marca", type: "custom", render: ({ grid }) => { grids.add(grid); return null; } },
    ];
    const ref = React.createRef<DataGridHandle<Editable>>();
    render(<DataGrid ref={ref} columns={withCommit} defaultValue={editableRows} getRowId={rowId} />);
    await retype(user, policyInput(0), "Nuevo");
    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ row: { ...editableRows[0], policy: "Nuevo" }, value: "Nuevo", prev: "Pérez", grid: ref.current });
    expect([...grids]).toEqual([ref.current]);
  });

  it("editable como función deja la celda bloqueada en lectura y una columna sin editable no edita", () => {
    const lockedColumns: DataGridColumn<Editable>[] = [
      { field: "policy", header: "Póliza", editable: row => row.locked !== true },
      { field: "collectedAmount", header: "Imp. cobrado", type: "currency" },
    ];
    render(<DataGrid columns={lockedColumns} value={[{ id: "r-1", policy: "Libre", collectedAmount: 1 }, { id: "r-2", policy: "Cerrada", collectedAmount: 2, locked: true }]} getRowId={rowId} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(policyInput(0)).toHaveValue("Libre");
    expect(within(bodyRows()[1]!).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Cerrada").closest("td")).not.toHaveAttribute("data-editable");
    expect(screen.getByText("$1.00")).toBeInTheDocument();
  });

  it("readOnly muestra todo en lectura y vuelve a role table", () => {
    const { rerender } = render(<DataGrid columns={editableColumns} value={editableRows} getRowId={rowId} />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    rerender(<DataGrid columns={editableColumns} value={editableRows} getRowId={rowId} readOnly />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Pérez")).toBeInTheDocument();
  });

  it("reset con un borrador abierto lo descarta y muestra el valor nuevo (Review Focus 4)", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const onChange = vi.fn();
    render(<DataGrid ref={ref} columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await retype(user, policyInput(0), "Borrador");
    await retype(user, amountInput(1), "444");
    const committedBeforeReset = onChange.mock.calls.length;
    const next = editableRows.map(row => row.id === "r-1" ? { ...row, policy: "Restaurado" } : row);
    act(() => ref.current?.reset(next));
    expect(policyInput(0)).toHaveValue("Restaurado");
    // r-2 conserva su valor en reset: el borrador también se descarta aunque el valor no cambie.
    expect(amountInput(1)).toHaveValue("$20.00");
    expect(policyInput(0).closest("td")).not.toHaveAttribute("data-draft-dirty");
    expect(onChange).toHaveBeenCalledTimes(committedBeforeReset + 1);
    expect(onChange.mock.lastCall![1]).toMatchObject({ type: "reset", rowId: null, field: null });
    expect(ref.current?.getData()).toMatchObject({ rows: next, dirtyIds: [], addedIds: [], removedIds: [], errors: {}, isValid: true });
  });

  it("patchRow actualiza por id, revalida y respeta el texto que se está escribiendo (Review Focus 2)", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const onChange = vi.fn();
    const required: DataGridColumn<Editable>[] = [{ ...editableColumns[0]!, required: true }, editableColumns[1]!];
    render(<DataGrid ref={ref} columns={required} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await retype(user, amountInput(0), "12.");
    act(() => ref.current?.patchRow("r-1", { policy: null }));
    expect(amountInput(0)).toHaveValue("12.");
    expect(amountInput(0)).toHaveFocus();
    expect(policyInput(0)).toHaveValue("");
    expect(policyInput(0).closest("td")).toHaveAttribute("data-invalid");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![1]).toEqual({ type: "edit", rowId: "r-1", field: "policy", prev: "Pérez", next: null });
    act(() => ref.current?.patchRow("no-existe", { policy: "x" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("getData devuelve exactamente las siete claves", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Editable>>();
    render(<DataGrid ref={ref} columns={editableColumns} defaultValue={editableRows} getRowId={rowId} selectionMode="multiple" />);
    await retype(user, amountInput(1), "21");
    await user.tab();
    await user.click(within(bodyRows()[0]!).getByRole("checkbox", { name: "Seleccionar fila" }));
    const data = ref.current!.getData();
    expect(Object.keys(data).sort()).toEqual(["addedIds", "dirtyIds", "errors", "isValid", "removedIds", "rows", "selectedIds"]);
    expect(data).toMatchObject({ selectedIds: ["r-1"], dirtyIds: ["r-2"], addedIds: [], removedIds: [], errors: {}, isValid: true });
    expect(data.rows[1]?.collectedAmount).toBe(21);
  });

  it("redimensionar actualiza ancho y desplazamiento de celdas ya memoizadas (Review Focus 6)", () => {
    const sized: DataGridColumn<Editable>[] = [
      { field: "id", header: "Id", width: 120, minWidth: 100, resizable: true, frozen: "left" },
      { ...editableColumns[1]!, width: 100, frozen: "left" },
      editableColumns[0]!,
    ];
    render(<DataGrid columns={sized} value={editableRows} getRowId={rowId} />);
    const idCell = screen.getByText("r-1").closest("td")!;
    const amountCell = amountInput(0).closest("td")!;
    expect(idCell).toHaveStyle({ width: "120px" });
    expect(amountCell).toHaveStyle({ left: "120px" });
    const separator = screen.getByRole("separator");
    fireEvent.mouseDown(separator, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 150 });
    fireEvent.mouseUp(document, { clientX: 150 });
    expect(idCell).toHaveStyle({ width: "170px" });
    expect(amountCell).toHaveStyle({ left: "170px" });
  });

  it("loading, density y visibilidad llegan a las filas memoizadas (Review Focus 6)", () => {
    const grid = (props: { loading?: boolean; density?: "compact" | "normal"; columnVisibility?: Record<string, boolean> }) => <DataGrid columns={editableColumns} value={editableRows} getRowId={rowId} {...props} />;
    const { rerender } = render(grid({}));
    expect(policyInput(0)).toBeEnabled();
    expect(policyInput(0).closest("td")).toHaveClass("py-1");
    rerender(grid({ loading: true }));
    expect(policyInput(0)).toBeDisabled();
    expect(amountInput(0)).toBeDisabled();
    rerender(grid({ density: "compact" }));
    expect(policyInput(0)).toBeEnabled();
    expect(policyInput(0).closest("td")).toHaveClass("py-0.5");
    rerender(grid({ columnVisibility: { policy: false, collectedAmount: true } }));
    expect(within(bodyRows()[0]!).queryByRole("textbox", { name: "Póliza" })).not.toBeInTheDocument();
  });

  it("el filtro usa el valor recién confirmado", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} />);
    await retype(user, policyInput(1), "Zulu");
    await user.tab();
    await applyFilter(user, "Póliza", "zulu");
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    expect(policyInput(0)).toHaveValue("Zulu");
    await applyFilter(user, "Póliza", "bravo");
    await waitFor(() => expect(screen.getByText("Sin resultados para los filtros aplicados")).toBeInTheDocument());
  });

  it("una celda editable no dispara onRowClick ni la selección single, y una de lectura sí", () => {
    const onRowClick = vi.fn();
    const onRowDoubleClick = vi.fn();
    const onSelectionChange = vi.fn();
    const mixed: DataGridColumn<Editable>[] = [editableColumns[0]!, { field: "id", header: "Id" }];
    render(<DataGrid columns={mixed} value={editableRows} getRowId={rowId} selectionMode="single" onRowClick={onRowClick} onRowDoubleClick={onRowDoubleClick} onSelectionChange={onSelectionChange} />);
    const input = policyInput(0);
    fireEvent.click(input);
    fireEvent.click(input.closest("td")!);
    fireEvent.doubleClick(input.closest("td")!);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(onRowDoubleClick).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("r-1"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(["r-1"]);
    expect(bodyRows()[0]).toHaveAttribute("data-selected");
  });

  it("tras una edición, un value externo de mayor precisión no se redondea al recorrerlo con Tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const grid = (value: Editable[]) => <DataGrid ref={ref} columns={editableColumns} value={value} getRowId={rowId} onChange={onChange} />;
    const { rerender } = render(grid(editableRows));
    await retype(user, amountInput(0), "5");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    const precise = editableRows.map(row => row.id === "r-1" ? { ...row, collectedAmount: 1.23456 } : row);
    rerender(grid(precise));
    await user.click(amountInput(0));
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current?.getData().rows[0]?.collectedAmount).toBe(1.23456);
  });

  it("un patchRow de mayor precisión sobre un borrador abierto no se redondea al salir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ref = React.createRef<DataGridHandle<Editable>>();
    render(<DataGrid ref={ref} columns={editableColumns} defaultValue={editableRows} getRowId={rowId} onChange={onChange} />);
    await retype(user, amountInput(0), "7");
    act(() => ref.current?.patchRow("r-1", { collectedAmount: 1.23456 }));
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current?.getData().rows[0]?.collectedAmount).toBe(1.23456);
  });

  it("la carga asíncrona inicial adopta la base sin emitir y una edición posterior solo marca esa fila", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const grid = (value: Editable[]) => <DataGrid ref={ref} columns={editableColumns} value={value} getRowId={rowId} onChange={onChange} />;
    const { rerender } = render(grid([]));
    rerender(grid([]));
    rerender(grid(editableRows));
    expect(onChange).not.toHaveBeenCalled();
    expect(policyInput(0)).toHaveValue("Pérez");
    expect(bodyRows()[0]).not.toHaveAttribute("data-dirty");
    expect(ref.current?.getData()).toMatchObject({ rows: editableRows, addedIds: [], dirtyIds: [], removedIds: [] });
    await retype(user, amountInput(1), "21");
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current?.getData()).toMatchObject({ addedIds: [], dirtyIds: ["r-2"], removedIds: [] });
  });

  it("tras la carga inicial, otro value usa replaceCurrent y conserva la base", () => {
    const ref = React.createRef<DataGridHandle<Editable>>();
    const grid = (value: Editable[]) => <DataGrid ref={ref} columns={editableColumns} value={value} getRowId={rowId} />;
    const { rerender } = render(grid([]));
    rerender(grid(editableRows));
    rerender(grid([{ id: "r-1", policy: "Recargada", collectedAmount: 10 }, { id: "r-9", policy: "Nueva", collectedAmount: 9 }]));
    expect(ref.current?.getData()).toMatchObject({ dirtyIds: ["r-1"], addedIds: ["r-9"], removedIds: ["r-2", "r-3"] });
  });

  it("con un cambio ya emitido sobre la tabla vacía, un value nuevo no se adopta como base", () => {
    const onChange = vi.fn();
    const ref = React.createRef<DataGridHandle<Editable>>();
    const grid = (value: Editable[]) => <DataGrid ref={ref} columns={editableColumns} value={value} getRowId={rowId} onChange={onChange} />;
    const { rerender } = render(grid([]));
    act(() => ref.current?.reset([]));
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender(grid(editableRows));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ref.current?.getData().addedIds).toEqual(["r-1", "r-2", "r-3"]);
  });

  it("data-draft-dirty se limpia al salir de la celda aunque NumberField no confirme", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={editableColumns} defaultValue={editableRows} getRowId={rowId} />);
    await retype(user, amountInput(0), "5");
    await user.keyboard("{Enter}");
    await retype(user, amountInput(0), "5");
    expect(amountInput(0).closest("td")).toHaveAttribute("data-draft-dirty");
    await user.tab();
    expect(amountInput(0).closest("td")).not.toHaveAttribute("data-draft-dirty");
  });

  it("los editores llevan fractionDigits, modo y slot editor de la columna", () => {
    const fx: DataGridColumn<Editable>[] = [
      { field: "collectedAmount", header: "Tipo de cambio", type: "number", fractionDigits: 4, editable: true },
      { field: "locked", header: "Pct", type: "percent", editable: true },
    ];
    render(<DataGrid columns={fx} value={[{ id: "r-1", policy: null, collectedAmount: 1.5, locked: 15 as unknown as boolean }]} getRowId={rowId} classNames={{ editor: "editor-slot" }} />);
    expect(screen.getByRole("textbox", { name: "Tipo de cambio" })).toHaveValue("1.5000");
    expect(screen.getByRole("textbox", { name: "Pct" })).toHaveValue("15.00 %");
    expect(screen.getByRole("textbox", { name: "Pct" }).closest('[data-slot="editor"]')?.firstElementChild).toHaveClass("editor-slot");
  });
});

describe("DataGrid: editores date, select, checkbox, radio y custom", () => {
  type Item = { id: string; due: string | null; method: number | null; paid: boolean | null; side: string | null; note?: string; amount?: number | null };
  const items: Item[] = [{ id: "r-1", due: null, method: null, paid: false, side: "D", amount: null }];
  const methods = [{ value: 1, label: "Efectivo" }, { value: 2, label: "Tarjeta" }];
  const sides = [{ value: "D", label: "Débito" }, { value: "C", label: "Crédito" }];
  const idOf = (row: Item) => row.id;
  const lastChange = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)![1];
  const base = (extra: Partial<DataGridColumn<Item>>): DataGridColumn<Item>[] => [{ editable: true, ...extra } as DataGridColumn<Item>];

  it("date: la fecha escrita se confirma en blur como ISO", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "due", header: "Vence", type: "date" })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.type(screen.getByLabelText("Vence"), "29/10/2026");
    await user.tab();
    expect(lastChange(onChange)).toEqual({ type: "edit", rowId: "r-1", field: "due", prev: null, next: "2026-10-29" });
  });

  it("select: elegir una opción guarda su valor y no la etiqueta", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "method", header: "Forma", type: "select", options: methods })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Forma" }));
    await user.click(await screen.findByRole("option", { name: "Efectivo" }));
    expect(lastChange(onChange)).toMatchObject({ type: "edit", field: "method", prev: null, next: 1 });
  });

  it("checkbox: confirma al cambiar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "paid", header: "Pagado", type: "checkbox" })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.click(screen.getByRole("checkbox", { name: "Pagado" }));
    expect(lastChange(onChange)).toMatchObject({ field: "paid", prev: false, next: true });
  });

  it("radio: elige Crédito, guarda C y la lectura muestra la etiqueta", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const col = { field: "side", header: "D/C", type: "radio", options: sides } as const;
    const { unmount } = render(<DataGrid columns={base(col)} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Débito" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Crédito" }));
    expect(lastChange(onChange)).toMatchObject({ field: "side", prev: "D", next: "C" });
    unmount();
    render(<DataGrid columns={[{ ...col, editable: false }]} value={[{ ...items[0]!, side: "C" }]} getRowId={idOf} />);
    expect(screen.getByText("Crédito")).toBeInTheDocument();
  });

  it("custom: la celda escribe con grid.patchRow", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const cols: DataGridColumn<Item>[] = [{ field: "note", header: "Nota", type: "custom", render: ({ grid, rowId }) => <button onClick={() => grid.patchRow(rowId, { note: "x" })}>poner</button> }];
    render(<DataGrid columns={cols} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "poner" }));
    expect(lastChange(onChange)).toMatchObject({ type: "edit", rowId: "r-1", field: "note", next: "x" });
  });

  it("cellTypes propio recibe onCommit y editable, y su valor llega al JSON", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Item>>();
    const Rating: DataGridCellComponent<Item> = ({ onCommit, editable, value }) => <button onClick={() => onCommit(5)}>{editable ? "editable" : "fijo"} {String(value)}</button>;
    render(<DataGrid ref={ref} cellTypes={{ rating: Rating }} columns={base({ field: "amount", header: "Nota", type: "rating" })} defaultValue={items} getRowId={idOf} />);
    await user.click(screen.getByRole("button", { name: "editable null" }));
    expect(ref.current?.getData().rows[0]?.amount).toBe(5);
  });

  it("editorProps openOnType false: teclear no abre el listado y Tab resuelve", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "method", header: "Forma", type: "select", options: methods, editorProps: { openOnType: false } })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    act(() => screen.getByRole("combobox", { name: "Forma" }).focus());
    await user.keyboard("Tarjeta");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.tab();
    expect(lastChange(onChange)).toMatchObject({ field: "method", next: 2 });
  });

  it("editorProps completePartialInput: '4' + Tab confirma el día 4 del mes actual", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "due", header: "Vence", type: "date", editorProps: { completePartialInput: true } })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.type(screen.getByLabelText("Vence"), "4");
    await user.tab();
    const now = new Date();
    expect(lastChange(onChange).next).toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-04`);
  });

  it("editorProps allowNegative: una columna numérica acepta -5", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "amount", header: "Saldo", type: "number", editorProps: { allowNegative: true } })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    await user.type(screen.getByRole("textbox", { name: "Saldo" }), "-5");
    await user.tab();
    expect(lastChange(onChange)).toMatchObject({ field: "amount", next: -5 });
  });

  it("el popover de la fecha no cuenta como salir de la celda y Esc lo cierra sin revertir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "due", header: "Vence", type: "date" })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    const input = screen.getByLabelText("Vence");
    await user.type(input, "29/10");
    const td = input.closest("td")!;
    expect(td).toHaveAttribute("data-draft-dirty");
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement?.closest("[role=dialog]")).not.toBeNull());
    expect(td).toHaveAttribute("data-draft-dirty");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Vence")).toHaveValue("29/10");
    expect(td).toHaveAttribute("data-draft-dirty");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("el listado del select no cuenta como salir de la celda y Esc lo cierra sin revertir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={base({ field: "method", header: "Forma", type: "select", options: methods })} defaultValue={items} getRowId={idOf} onChange={onChange} />);
    const input = screen.getByRole("combobox", { name: "Forma" });
    await user.type(input, "Ta");
    const td = input.closest("td")!;
    const listbox = await screen.findByRole("listbox");
    expect(td).toHaveAttribute("data-draft-dirty");
    fireEvent.blur(input, { relatedTarget: listbox });
    expect(td).toHaveAttribute("data-draft-dirty");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(td).toHaveAttribute("data-draft-dirty");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("onRowClick y onRowDoubleClick ignoran clics que llegan desde un portal dentro de una celda", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onRowDoubleClick = vi.fn();
    render(<DataGrid columns={base({ field: "method", header: "Forma", type: "select", options: methods })} defaultValue={items} getRowId={idOf} onRowClick={onRowClick} onRowDoubleClick={onRowDoubleClick} />);
    await user.click(screen.getByRole("combobox", { name: "Forma" }));
    const option = await screen.findByRole("option", { name: "Tarjeta" });
    fireEvent.doubleClick(option);
    await user.click(option);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(onRowDoubleClick).not.toHaveBeenCalled();
  });
});
