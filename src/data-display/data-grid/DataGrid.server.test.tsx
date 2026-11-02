import * as React from "react";
import { describe, it, expect, expectTypeOf, vi, beforeAll, onTestFinished } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid } from "./DataGrid";
import type { DataGridColumn, DataGridFilterOperator, DataGridHandle, DataGridProps, DataGridQuery } from "./DataGrid.types";

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

const base: DataGridQuery = { pageIndex: 0, pageSize: 10, sorting: [], filters: {} };
const pageRows = (pageIndex: number, pageSize = 10): Premium[] => Array.from({ length: pageSize }, (_, i) => {
  const n = pageIndex * pageSize + i + 1;
  return { id: `r-${n}`, policy: `Pol ${n}`, collectedAmount: n, dueDate: null };
});
const queriesOf = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.map(call => call[0] as DataGridQuery);
const editableColumns: DataGridColumn<Premium>[] = [{ field: "policy", header: "Póliza", editable: true }, columns[1]!, columns[2]!];
type RemoteProps = Partial<DataGridProps<Premium>> & { total?: number; onQuery?: (query: DataGridQuery) => void; gridRef?: React.Ref<DataGridHandle<Premium>> };
// Imita a un padre real: cada consulta trae la página pedida.
function Remote({ total = 120, onQuery, gridRef, ...rest }: RemoteProps) {
  const [query, setQuery] = React.useState(base);
  const value = React.useMemo(() => pageRows(query.pageIndex, query.pageSize), [query]);
  return <DataGrid ref={gridRef} columns={columns} getRowId={getRowId} value={value} {...rest} serverSide={{ totalRecords: total, onQueryChange: next => { onQuery?.(next); setQuery(next); } }} />;
}
const click = (user: User, name: string) => user.click(screen.getByRole("button", { name }));
const next = async (user: User, times = 1) => { for (let i = 0; i < times; i++) await click(user, "Página siguiente"); };
const check = (index: number) => within(bodyRows()[index]!).getByRole("checkbox", { name: "Seleccionar fila" });

describe("DataGrid: serverSide", () => {
  it("exporta DataGridQuery y la prop serverSide", () => {
    expectTypeOf<DataGridQuery>().toEqualTypeOf<{ pageIndex: number; pageSize: number; sorting: Array<{ field: string; desc: boolean }>; filters: Record<string, { operator: DataGridFilterOperator; value: unknown }> }>();
    expectTypeOf<NonNullable<DataGridProps<Premium>["serverSide"]>>().toEqualTypeOf<{ totalRecords: number; onQueryChange: (query: DataGridQuery) => void }>();
  });

  it("al montar emite una vez la consulta inicial, con initialSort", () => {
    const onQuery = vi.fn();
    const { unmount } = render(<Remote onQuery={onQuery} />);
    expect(queriesOf(onQuery)).toEqual([base]);
    unmount();
    const sorted = vi.fn();
    render(<Remote onQuery={sorted} initialSort={{ field: "dueDate", direction: "desc" }} />);
    expect(queriesOf(sorted)).toEqual([{ ...base, sorting: [{ field: "dueDate", desc: true }] }]);
  });

  it("StrictMode no duplica la consulta inicial", () => {
    const onQuery = vi.fn();
    render(<React.StrictMode><DataGrid columns={columns} getRowId={getRowId} value={pageRows(0)} serverSide={{ totalRecords: 120, onQueryChange: onQuery }} /></React.StrictMode>);
    expect(onQuery).toHaveBeenCalledTimes(1);
  });

  it("un serverSide inline, un totalRecords nuevo o un onQueryChange nuevo no reemiten", () => {
    const first = vi.fn();
    const second = vi.fn();
    const value = pageRows(0);
    const { rerender } = render(<DataGrid columns={columns} getRowId={getRowId} value={value} serverSide={{ totalRecords: 120, onQueryChange: first }} />);
    rerender(<DataGrid columns={columns} getRowId={getRowId} value={value} serverSide={{ totalRecords: 80, onQueryChange: first }} />);
    rerender(<DataGrid columns={columns} getRowId={getRowId} value={value} serverSide={{ totalRecords: 80, onQueryChange: second }} />);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it("Página siguiente emite pageIndex 1", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await next(user);
    expect(queriesOf(onQuery)).toEqual([base, { ...base, pageIndex: 1 }]);
  });

  it("filtrar desde la página 4 emite una sola consulta en la página 0; escribir sin aplicar no emite", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await next(user, 4);
    expect(onQuery).toHaveBeenCalledTimes(5);
    const menu = await openFilter(user, "Póliza");
    await user.selectOptions(within(menu).getByRole("combobox", { name: "Condición" }), "startsWith");
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Póliza" }), "per");
    expect(onQuery).toHaveBeenCalledTimes(5);
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    expect(onQuery).toHaveBeenCalledTimes(6);
    expect(onQuery).toHaveBeenLastCalledWith({ ...base, filters: { policy: { operator: "startsWith", value: "per" } } });
  });

  it("limpiar quita el filtro en una consulta; repetir el mismo filtro o limpiar sin filtro no emite ni cambia de página", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await clearFilter(user, "Póliza");
    expect(onQuery).toHaveBeenCalledTimes(1);
    await applyFilter(user, "Póliza", "Pol");
    expect(onQuery).toHaveBeenCalledTimes(2);
    await next(user, 2);
    expect(onQuery).toHaveBeenCalledTimes(4);
    await applyFilter(user, "Póliza", "Pol");
    expect(onQuery).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Página 3 de 12")).toBeInTheDocument();
    await clearFilter(user, "Póliza");
    expect(onQuery).toHaveBeenCalledTimes(5);
    expect(onQuery).toHaveBeenLastCalledWith(base);
    await clearFilter(user, "Póliza");
    expect(onQuery).toHaveBeenCalledTimes(5);
  });

  it("ordenar vuelve a la página 0 en una consulta y las filas se muestran como llegaron", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await next(user, 2);
    const sort = screen.getByRole("button", { name: "Ordenar por Imp. cobrado" });
    await user.click(sort);
    expect(onQuery).toHaveBeenCalledTimes(4);
    expect(onQuery).toHaveBeenLastCalledWith({ ...base, sorting: [{ field: "collectedAmount", desc: false }] });
    await user.click(sort);
    expect(onQuery).toHaveBeenLastCalledWith({ ...base, sorting: [{ field: "collectedAmount", desc: true }] });
    expect(bodyRows()[0]).toHaveTextContent("Pol 1");
    expect(bodyRows()[9]).toHaveTextContent("Pol 10");
  });

  it("cambiar el tamaño de página es una consulta con pageIndex 0", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await next(user, 2);
    await user.selectOptions(screen.getByRole("combobox", { name: "Filas por página" }), "25");
    expect(onQuery).toHaveBeenCalledTimes(4);
    expect(onQuery).toHaveBeenLastCalledWith({ ...base, pageSize: 25 });
  });

  it("totalRecords define el rango y las páginas; en la página 2 de 120 muestra 11 al 20", async () => {
    const user = userEvent.setup();
    render(<Remote />);
    await next(user);
    expect(screen.getByText("Mostrando 11 al 20 de 120 registros")).toBeInTheDocument();
    expect(screen.getByText("Página 2 de 12")).toBeInTheDocument();
  });

  it("totalRecords 0, negativo o no finito se trata como 0: estado vacío y botones deshabilitados", () => {
    for (const total of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { unmount } = render(<DataGrid columns={columns} getRowId={getRowId} value={[]} serverSide={{ totalRecords: total, onQueryChange: vi.fn() }} />);
      expect(screen.getByText("Sin registros")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 0 al 0 de 0 registros")).toBeInTheDocument();
      expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
      for (const name of ["Primera página", "Página anterior", "Página siguiente", "Última página"]) expect(screen.getByRole("button", { name })).toBeDisabled();
      unmount();
    }
  });

  it("sin filas con un filtro activo muestra noResults; sin filtro, el título vacío", async () => {
    const user = userEvent.setup();
    const Empty = () => <DataGrid columns={columns} getRowId={getRowId} value={[]} serverSide={{ totalRecords: 0, onQueryChange: vi.fn() }} />;
    render(<Empty />);
    await applyFilter(user, "Póliza", "zz");
    expect(await screen.findByText("Sin resultados para los filtros aplicados")).toBeInTheDocument();
    await clearFilter(user, "Póliza");
    expect(screen.getByText("Sin registros")).toBeInTheDocument();
  });

  it("loading con filas pinta la capa", () => {
    const { container } = render(<DataGrid columns={columns} getRowId={getRowId} value={rows} loading serverSide={{ totalRecords: 3, onQueryChange: vi.fn() }} />);
    expect(container.querySelector('[data-slot="overlay"]')).not.toBeNull();
  });

  it("pagination=false con serverSide consulta pageIndex 0 y el tamaño por defecto, sin paginador", () => {
    const onQuery = vi.fn();
    const { container } = render(<DataGrid columns={columns} getRowId={getRowId} value={rows} pagination={false} serverSide={{ totalRecords: 3, onQueryChange: onQuery }} />);
    expect(queriesOf(onQuery)).toEqual([base]);
    expect(container.querySelector('[data-slot="paginator"]')).toBeNull();
  });

  it("ocultar la columna con filtro desde el toggler es una consulta en la página 0 sin ese filtro", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<Remote onQuery={onQuery} />);
    await applyFilter(user, "Póliza", "Pol");
    await next(user);
    expect(onQuery).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(onQuery).toHaveBeenCalledTimes(4);
    expect(onQuery).toHaveBeenLastCalledWith(base);
  });

  it("ocultarla con columnVisibility controlado también es una sola consulta en la página 0", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    const visible = { policy: true, collectedAmount: true, dueDate: true };
    const value = pageRows(0);
    const ui = (visibility: Record<string, boolean>) => <DataGrid columns={columns} getRowId={getRowId} value={value} columnVisibility={visibility} serverSide={{ totalRecords: 120, onQueryChange: onQuery }} />;
    const { rerender } = render(ui(visible));
    await applyFilter(user, "Póliza", "Pol");
    await next(user);
    expect(onQuery).toHaveBeenCalledTimes(3);
    rerender(ui({ ...visible, policy: false }));
    expect(onQuery).toHaveBeenCalledTimes(4);
    expect(onQuery).toHaveBeenLastCalledWith(base);
  });

  it("la selección de una página sobrevive a ir y volver; seleccionar todo actúa solo sobre la visible", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Remote selectionMode="multiple" onSelectionChange={onSelectionChange} />);
    await user.click(check(0));
    await next(user);
    expect(check(0)).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" }));
    expect(onSelectionChange.mock.lastCall![0]).toHaveLength(11);
    expect(onSelectionChange.mock.lastCall![0]).toEqual(expect.arrayContaining(["r-1", "r-11", "r-20"]));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar todas las filas de la página" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["r-1"]);
    await click(user, "Página anterior");
    expect(check(0)).toBeChecked();
  });

  describe("el store adopta cada value externo", () => {
    it("cambiar de página no deja diff ni emite onChange", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const ref = React.createRef<DataGridHandle<Premium>>();
      render(<Remote columns={editableColumns} onChange={onChange} gridRef={ref} />);
      const input = within(bodyRows()[0]!).getByRole("textbox", { name: "Póliza" });
      await user.clear(input);
      await user.type(input, "Editada");
      await user.tab();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(ref.current?.getData().dirtyIds).toEqual(["r-1"]);
      await next(user);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(ref.current?.getData()).toMatchObject({ dirtyIds: [], addedIds: [], removedIds: [] });
      expect(ref.current?.getData().rows.map(row => row.id)).toEqual(pageRows(1).map(row => row.id));
    });

    it("una fila con el mismo id y valor nuevo del servidor muestra el nuevo, aunque haya un borrador", async () => {
      const user = userEvent.setup();
      const serverSide = { totalRecords: 20, onQueryChange: vi.fn() };
      const ui = (policy: string) => <DataGrid columns={editableColumns} getRowId={getRowId} value={[{ id: "r-1", policy, collectedAmount: 1, dueDate: null }]} serverSide={serverSide} />;
      const { rerender } = render(ui("Servidor 1"));
      const input = () => within(bodyRows()[0]!).getByRole("textbox", { name: "Póliza" });
      await user.clear(input());
      await user.type(input(), "borrador");
      rerender(ui("Servidor 2"));
      expect(input()).toHaveValue("Servidor 2");
    });
  });

  it("focusCell sobre una fila visible de la página 4 no emite consulta y enfoca la celda", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    const ref = React.createRef<DataGridHandle<Premium>>();
    render(<Remote columns={editableColumns} onQuery={onQuery} gridRef={ref} />);
    await next(user, 4);
    onQuery.mockClear();
    act(() => ref.current?.focusCell("r-45", "policy"));
    expect(onQuery).not.toHaveBeenCalled();
    expect(screen.getByText("Página 5 de 12")).toBeInTheDocument();
    const cell = document.querySelector('td[data-row-id="r-45"][data-field="policy"]')!;
    expect(cell.contains(document.activeElement)).toBe(true);
  });

  describe("página fuera de rango", () => {
    const ui = (over: Partial<DataGridProps<Premium>> & { total: number; value: Premium[]; onQuery: (query: DataGridQuery) => void }) => {
      const { total, value, onQuery, ...rest } = over;
      return <DataGrid columns={columns} getRowId={getRowId} value={value} serverSide={{ totalRecords: total, onQueryChange: onQuery }} {...rest} />;
    };

    it("si totalRecords baja con filas presentes no hay consulta extra, y el paginador usa la página mostrada", async () => {
      const user = userEvent.setup();
      const onQuery = vi.fn();
      const value = pageRows(5);
      const { rerender } = render(ui({ total: 60, value, onQuery }));
      await click(user, "Última página");
      expect(queriesOf(onQuery).at(-1)!.pageIndex).toBe(5);
      const before = onQuery.mock.calls.length;
      rerender(ui({ total: 20, value, onQuery }));
      expect(onQuery).toHaveBeenCalledTimes(before);
      expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 11 al 20 de 20 registros")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
      await click(user, "Página anterior");
      expect(onQuery).toHaveBeenCalledTimes(before + 1);
      expect(onQuery).toHaveBeenLastCalledWith({ ...base, pageIndex: 0 });
    });

    it("un totalRecords 0 transitorio con loading tras pulsar siguiente no consulta la página 0", async () => {
      const user = userEvent.setup();
      const onQuery = vi.fn();
      const { rerender } = render(ui({ total: 60, value: pageRows(0), onQuery }));
      await next(user);
      expect(onQuery).toHaveBeenCalledTimes(2);
      rerender(ui({ total: 0, value: [], loading: true, onQuery }));
      rerender(ui({ total: 60, value: pageRows(1), onQuery }));
      expect(onQuery).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Página 2 de 6")).toBeInTheDocument();
    });

    it("sin filas, sin loading y con registros, vuelve a la última página existente en una sola consulta", async () => {
      const user = userEvent.setup();
      const onQuery = vi.fn();
      const { rerender } = render(ui({ total: 60, value: pageRows(0), onQuery }));
      await click(user, "Última página");
      const before = onQuery.mock.calls.length;
      rerender(ui({ total: 20, value: [], onQuery }));
      expect(onQuery).toHaveBeenCalledTimes(before + 1);
      expect(onQuery).toHaveBeenLastCalledWith({ ...base, pageIndex: 1 });
    });
  });

  it("la llegada del catálogo remoto no reordena las filas ni emite una consulta", async () => {
    let resolve!: (options: { value: number; label: string }[]) => void;
    const loadOptions = vi.fn(() => new Promise<{ value: number; label: string }[]>(res => { resolve = res; }));
    const onQuery = vi.fn();
    type Pay = { id: string; method: number };
    const value: Pay[] = [{ id: "a", method: 1 }, { id: "b", method: 2 }];
    render(<DataGrid columns={[{ field: "method", header: "Forma", type: "select", loadOptions }]} getRowId={(row: Pay) => row.id} value={value} initialSort={{ field: "method", direction: "asc" }} serverSide={{ totalRecords: 2, onQueryChange: onQuery }} />);
    const order = () => bodyRows().map(row => row.textContent);
    expect(order()).toEqual(["1", "2"]);
    await act(async () => { resolve([{ value: 1, label: "Zeta" }, { value: 2, label: "Alfa" }]); });
    expect(order()).toEqual(["Zeta", "Alfa"]);
    expect(onQuery).toHaveBeenCalledTimes(1);
  });

  describe("selección cuando un value externo quita filas", () => {
    function Host({ value, onSelectionChange, selection }: { value: Premium[]; onSelectionChange: (ids: string[]) => void; selection?: string[] }) {
      return <DataGrid columns={columns} getRowId={getRowId} value={value} selectionMode="multiple" selection={selection} onSelectionChange={onSelectionChange} />;
    }

    it("sin serverSide, la fila que desaparece sale de la selección con un solo aviso y el siguiente cambio no la emite", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const { rerender } = render(<Host value={rows} onSelectionChange={onSelectionChange} />);
      await user.click(check(0));
      await user.click(check(1));
      onSelectionChange.mockClear();
      rerender(<Host value={[rows[0]!, rows[2]!]} onSelectionChange={onSelectionChange} />);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(["r-1"]);
      await user.click(check(1));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["r-1", "r-3"]);
    });

    it("no quita ids que nunca se cargaron, como una selección controlada previa a los datos", () => {
      const onSelectionChange = vi.fn();
      const selection = ["r-2", "r-9"];
      const { rerender } = render(<Host value={[]} selection={selection} onSelectionChange={onSelectionChange} />);
      rerender(<Host value={[rows[0]!, rows[1]!]} selection={selection} onSelectionChange={onSelectionChange} />);
      expect(onSelectionChange).not.toHaveBeenCalled();
      rerender(<Host value={[rows[0]!]} selection={selection} onSelectionChange={onSelectionChange} />);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(["r-9"]);
    });

    it("una fila oculta solo por un filtro sigue seleccionada", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const { rerender } = render(<Host value={rows} onSelectionChange={onSelectionChange} />);
      await user.click(check(1));
      await applyFilter(user, "Póliza", "Alfa");
      onSelectionChange.mockClear();
      rerender(<Host value={[...rows]} onSelectionChange={onSelectionChange} />);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("un value que es el arreglo emitido por la grilla no vuelve a quitar la fila", () => {
      const ref = React.createRef<DataGridHandle<Premium>>();
      const onSelectionChange = vi.fn();
      function Echo() {
        const [value, setValue] = React.useState(rows);
        return <DataGrid ref={ref} columns={columns} getRowId={getRowId} value={value} onChange={data => setValue(data.rows)} selectionMode="multiple" selection={["r-1", "r-2"]} onSelectionChange={onSelectionChange} />;
      }
      render(<Echo />);
      act(() => ref.current?.removeRow("r-2"));
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(["r-1"]);
    });

    it("con serverSide conserva todos los ids de otras páginas", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      render(<Remote selectionMode="multiple" onSelectionChange={onSelectionChange} />);
      await user.click(check(0));
      await next(user);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      await user.click(check(0));
      expect(onSelectionChange).toHaveBeenLastCalledWith(["r-1", "r-11"]);
    });
  });
});

describe("DataGrid: serverSide, refresco con las mismas filas", () => {
  type R = { id: string; a: string; b: string };
  const initial: R[] = [{ id: "1", a: "a1", b: "b1" }, { id: "2", a: "a2", b: "b2" }];
  const cols: DataGridColumn<R>[] = [{ field: "a", header: "A", editable: true }, { field: "b", header: "B", editable: true }];
  const rid = (row: R) => row.id;
  const input = (row: number, name: string) => within(bodyRows()[row]!).getByRole("textbox", { name }) as HTMLInputElement;
  const noop = () => {};
  const mapping = (ref?: React.Ref<DataGridHandle<R>>) => function Parent() {
    const [list, setList] = React.useState(initial);
    return <DataGrid ref={ref} columns={cols} getRowId={rid} value={list} serverSide={{ totalRecords: 2, onQueryChange: noop }}
      onChange={(_data, change) => setList(prev => prev.map(row => row.id === change.rowId && change.field ? { ...row, [change.field]: change.next } : row))} />;
  };

  it("un padre que mapea las filas en onChange conserva diff y foco con Tab, y se sigue escribiendo", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<R>>();
    const Parent = mapping(ref);
    render(<Parent />);
    await user.click(input(0, "A"));
    await user.type(input(0, "A"), "X");
    await user.tab();
    expect(document.activeElement).toBe(input(0, "B"));
    expect(ref.current?.getData().dirtyIds).toEqual(["1"]);
    await user.keyboard("zz");
    expect(input(0, "B").value).toBe("zz");
  });

  it("con Enter el foco pasa a la fila siguiente", async () => {
    const user = userEvent.setup();
    const Parent = mapping();
    render(<Parent />);
    await user.click(input(0, "A"));
    await user.type(input(0, "A"), "X{Enter}");
    expect(document.activeElement).toBe(input(1, "A"));
  });

  it("un refresco con otro arreglo y los mismos ids no pierde el borrador ni el foco", async () => {
    const user = userEvent.setup();
    let refetch!: () => void;
    function Parent() {
      const [list, setList] = React.useState(initial);
      refetch = () => setList(prev => prev.map(row => ({ ...row })));
      return <DataGrid columns={cols} getRowId={rid} value={list} serverSide={{ totalRecords: 2, onQueryChange: noop }} />;
    }
    render(<Parent />);
    await user.click(input(1, "B"));
    await user.type(input(1, "B"), "draft");
    act(() => refetch());
    expect(input(1, "B").value).toBe("b2draft");
    expect(document.activeElement).toBe(input(1, "B"));
  });

  it("añadir una fila a value y enfocarla en el mismo manejador deja el foco en la celda nueva", () => {
    const ref = React.createRef<DataGridHandle<R>>();
    let add!: () => void;
    function Parent() {
      const [list, setList] = React.useState(initial);
      add = () => { setList(prev => [...prev, { id: "3", a: "", b: "" }]); ref.current?.focusCell("3", "a"); };
      return <DataGrid ref={ref} columns={cols} getRowId={rid} value={list} serverSide={{ totalRecords: 3, onQueryChange: noop }} />;
    }
    render(<Parent />);
    act(() => add());
    expect(document.activeElement).toBe(input(2, "A"));
  });

  it("volver a una página cuyo arreglo la grilla emitió antes muestra esa página, no la adoptada después", async () => {
    const user = userEvent.setup();
    function Parent() {
      const [page, setPage] = React.useState(0);
      const [pages, setPages] = React.useState<Record<number, Premium[]>>({ 0: pageRows(0), 1: pageRows(1) });
      return <DataGrid columns={editableColumns} getRowId={getRowId} value={pages[page]} onChange={data => setPages(current => ({ ...current, [page]: data.rows }))}
        serverSide={{ totalRecords: 20, onQueryChange: query => setPage(query.pageIndex) }} />;
    }
    render(<Parent />);
    const first = () => within(bodyRows()[0]!).getByRole("textbox", { name: "Póliza" });
    await user.clear(first());
    await user.type(first(), "Editada");
    await user.tab();
    await next(user);
    expect(first()).toHaveValue("Pol 11");
    await click(user, "Página anterior");
    expect(first()).toHaveValue("Editada");
  });
});

describe("DataGrid: serverSide, avisos de desarrollo", () => {
  const warnSpy = () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    onTestFinished(() => warn.mockRestore());
    return warn;
  };
  const rowsOf = (ids: string[]): Premium[] => ids.map(id => ({ id, policy: `Pol ${id}`, collectedAmount: 1, dueDate: null }));
  const policyBox = () => within(bodyRows()[0]!).getByRole("textbox", { name: "Póliza" });

  it("añadir filas por value con ediciones pendientes y sin consulta avisa y apunta a ref.addRow", async () => {
    const user = userEvent.setup();
    const warn = warnSpy();
    const serverSide = { totalRecords: 20, onQueryChange: vi.fn() };
    const ui = (list: Premium[]) => <DataGrid columns={editableColumns} getRowId={getRowId} value={list} serverSide={serverSide} />;
    const { rerender } = render(ui(rowsOf(["a", "b"])));
    // La respuesta a la consulta de montaje: mismas filas, arreglo nuevo.
    rerender(ui(rowsOf(["a", "b"])));
    await user.type(policyBox(), "X");
    await user.tab();
    rerender(ui(rowsOf(["a", "b", "c"])));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ref.addRow"));
  });

  it("un cambio de página tras editar no avisa: hubo una consulta", async () => {
    const user = userEvent.setup();
    const warn = warnSpy();
    render(<Remote columns={editableColumns} total={30} />);
    await user.type(policyBox(), "X");
    await user.tab();
    await next(user);
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalled();
  });

  it("sin ediciones pendientes, otro conjunto de ids sin consulta no avisa", () => {
    const warn = warnSpy();
    const serverSide = { totalRecords: 20, onQueryChange: vi.fn() };
    const ui = (list: Premium[]) => <DataGrid columns={editableColumns} getRowId={getRowId} value={list} serverSide={serverSide} />;
    const { rerender } = render(ui(rowsOf(["a"])));
    rerender(ui(rowsOf(["a"])));
    rerender(ui(rowsOf(["a", "b"])));
    expect(warn).not.toHaveBeenCalled();
  });

  it("serverSide sin value avisa una sola vez; con value no avisa", () => {
    const warn = warnSpy();
    const serverSide = { totalRecords: 20, onQueryChange: vi.fn() };
    const { rerender } = render(<DataGrid columns={columns} getRowId={getRowId} defaultValue={rows} serverSide={serverSide} />);
    rerender(<DataGrid columns={columns} getRowId={getRowId} defaultValue={rows} serverSide={{ ...serverSide }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("value"));
    warn.mockClear();
    render(<DataGrid columns={columns} getRowId={getRowId} value={rows} serverSide={serverSide} />);
    expect(warn).not.toHaveBeenCalled();
  });
});
