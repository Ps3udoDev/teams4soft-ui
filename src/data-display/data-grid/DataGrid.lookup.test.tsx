import * as React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid } from "./DataGrid";
import type { DataGridCellComponent, DataGridColumn, DataGridData, DataGridHandle } from "./DataGrid.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});

type Row = { id: string; ramo: number | null; note: string };
type Opt = { value: number; label: string; code?: string };

const catalog: Opt[] = [
  { value: 10, label: "Ramo 1", code: "R1" },
  { value: 20, label: "Ramo 2", code: "R2" },
  { value: 30, label: "Otro", code: "O" },
];
const search = (query: string) => {
  const needle = query.trim().toLowerCase();
  return needle ? catalog.filter(option => option.label.toLowerCase().includes(needle)) : catalog;
};
const makeLoader = () => vi.fn(async (query: string) => search(query));
const rowId = (row: Row) => row.id;
const twoEmpty: Row[] = [{ id: "r-1", ramo: null, note: "a" }, { id: "r-2", ramo: null, note: "b" }];
const stored: Row[] = [{ id: "r-1", ramo: 30, note: "a" }, { id: "r-2", ramo: 10, note: "b" }];

const column = (extra: Partial<DataGridColumn<Row>> = {}): DataGridColumn<Row> => ({ field: "ramo", header: "Ramo", type: "lookup", editable: true, ...extra });
const readColumn = (extra: Partial<DataGridColumn<Row>> = {}) => column({ editable: false, ...extra });
const inputs = () => screen.getAllByRole("textbox", { name: "Ramo" }) as HTMLInputElement[];
const dialog = () => screen.getByRole("dialog", { name: "Seleccionar elemento" });
const queryDialog = () => screen.queryByRole("dialog", { name: "Seleccionar elemento" });
const queriesOf = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.map(call => call[0]);
const countOf = (fn: { mock: { calls: unknown[][] } }, query: string) => queriesOf(fn).filter(item => item === query).length;
const flush = (ms = 20) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const lastRows = (fn: { mock: { calls: unknown[][] } }) => (fn.mock.calls.at(-1)![0] as DataGridData<Row>).rows;
const bodyCells = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("cell");
function deferred<V>() {
  let resolve!: (value: V) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<V>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("DataGrid: celda lookup, confirmación", () => {
  it("teclear y Tab con una coincidencia escribe el valor de la opción", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await user.type(inputs()[0]!, "Ramo 1");
    await user.tab();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(lastRows(onChange)[0]!.ramo).toBe(10);
    expect(lastRows(onChange)[1]!.ramo).toBeNull();
    expect(inputs()[0]).toHaveValue("Ramo 1");
  });

  it("usa getOptionValue y getOptionLabel de la columna", async () => {
    type Custom = { key: number; title: string };
    const options: Custom[] = [{ key: 7, title: "Siete" }];
    const user = userEvent.setup();
    const onChange = vi.fn();
    const col = {
      field: "ramo", header: "Ramo", type: "lookup", editable: true,
      loadOptions: async () => options, getOptionValue: (o: Custom) => o.key, getOptionLabel: (o: Custom) => o.title,
    } as unknown as DataGridColumn<Row>;
    render(<DataGrid columns={[col]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await user.type(inputs()[0]!, "si");
    await user.tab();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(lastRows(onChange)[0]!.ramo).toBe(7);
    expect(inputs()[0]).toHaveValue("Siete");
  });

  it("dos celdas que buscan el mismo texto recortado llaman a loadOptions una vez", async () => {
    const user = userEvent.setup();
    const loadOptions = makeLoader();
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={twoEmpty} getRowId={rowId} />);
    await user.type(inputs()[0]!, "ra");
    await user.keyboard("{Tab}");
    const first = await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(first).not.toBeInTheDocument());
    await user.type(inputs()[1]!, "  ra ");
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(countOf(loadOptions, "ra")).toBe(1);
    expect(queriesOf(loadOptions).filter(query => query !== "" && query !== "ra")).toEqual([]);
  });

  it("borrar el texto confirma null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
    await user.clear(inputs()[0]!);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastRows(onChange)[0]!.ramo).toBeNull();
  });

  it("un texto abandonado con un clic fuera también se resuelve", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<><DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} /><button>fuera</button></>);
    await user.type(inputs()[0]!, "Otro");
    await user.click(screen.getByRole("button", { name: "fuera" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(lastRows(onChange)[0]!.ramo).toBe(30);
  });

  it("una columna con options y sin loadOptions busca entre esas opciones", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ options: catalog })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await user.type(inputs()[0]!, "otro");
    await user.tab();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(lastRows(onChange)[0]!.ramo).toBe(30);
  });
});

describe("DataGrid: celda lookup, foco y modal", () => {
  it("con el modal abierto no hay confirmación; aceptar escribe una vez y devuelve el foco al input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    const input = inputs()[0]!;
    await user.type(input, "ramo");
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(onChange).not.toHaveBeenCalled();
    await user.click(within(dialog()).getAllByRole("radio")[1]!);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(within(dialog()).getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastRows(onChange)[0]!.ramo).toBe(20);
    expect(inputs()[0]).toHaveValue("Ramo 2");
    await waitFor(() => expect(inputs()[0]).toHaveFocus());
  });

  it("Escape en el modal cierra solo el modal: la edición de la celda sigue; otro Escape la revierte", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
    await user.clear(inputs()[1]!);
    onChange.mockClear();
    await user.type(inputs()[1]!, "ramo");
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(inputs()[1]).toHaveValue("ramo");
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(inputs()[1]).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(inputs()[1]).toHaveValue(""));
  });

  describe("modal cancelado en una fila que no es la última", () => {
    const resolved: Row[] = [{ id: "r-1", ramo: 10, note: "a" }, { id: "r-2", ramo: 30, note: "b" }];
    const cancelAndRevert = async (user: ReturnType<typeof userEvent.setup>, onChange: ReturnType<typeof vi.fn>) => {
      await screen.findByRole("dialog", { name: "Seleccionar elemento" });
      await user.keyboard("{Escape}");
      await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
      await waitFor(() => expect(inputs()[0]).toHaveFocus());
      expect(inputs()[1]).not.toHaveFocus();
      expect(inputs()[0]).toHaveValue("Ramo");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(inputs()[0]).toHaveValue("Ramo 1"));
      expect(onChange).not.toHaveBeenCalled();
      expect(inputs()[0]).toHaveFocus();
    };

    it("búsqueda iniciada con Enter: el foco vuelve a su celda y otro Escape revierte", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={resolved} getRowId={rowId} onChange={onChange} />);
      await waitFor(() => expect(inputs()[0]).toHaveValue("Ramo 1"));
      await user.type(inputs()[0]!, "{Backspace}{Backspace}");
      await user.keyboard("{Enter}");
      await cancelAndRevert(user, onChange);
    });

    it("búsqueda iniciada con Tab: el foco vuelve a su celda y otro Escape revierte", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={resolved} getRowId={rowId} onChange={onChange} />);
      await waitFor(() => expect(inputs()[0]).toHaveValue("Ramo 1"));
      await user.type(inputs()[0]!, "{Backspace}{Backspace}");
      await user.tab();
      await cancelAndRevert(user, onChange);
    });

    it("búsqueda iniciada con Tab que ya salió de la celda antes de responder: igual", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const gate = deferred<Opt[]>();
      const loadOptions = vi.fn((query: string) => query === "Ramo" ? gate.promise : Promise.resolve(search(query)));
      render(<DataGrid columns={[column({ loadOptions })]} defaultValue={resolved} getRowId={rowId} onChange={onChange} />);
      await waitFor(() => expect(inputs()[0]).toHaveValue("Ramo 1"));
      await user.type(inputs()[0]!, "{Backspace}{Backspace}");
      await user.tab();
      await user.tab();
      expect(inputs()[1]).toHaveFocus();
      await act(async () => { gate.resolve(search("Ramo")); });
      await cancelAndRevert(user, onChange);
    });
  });

  describe("Enter sobre texto no escrito", () => {
    const walk: Row[] = [{ id: "r-1", ramo: 999, note: "a" }, { id: "r-2", ramo: 30, note: "b" }, { id: "r-3", ramo: null, note: "c" }];

    it("recorrer la columna con Enter no busca, no emite, no abre nada y conserva los valores", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const loadOptions = makeLoader();
      render(<DataGrid columns={[column({ loadOptions })]} defaultValue={walk} getRowId={rowId} onChange={onChange} />);
      await waitFor(() => expect(inputs()[1]).toHaveValue("Otro"));
      expect(inputs()[0]).toHaveValue("999");
      act(() => inputs()[0]!.focus());
      await user.keyboard("{Enter}");
      expect(inputs()[1]).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(inputs()[2]).toHaveFocus();
      await flush();
      expect(queriesOf(loadOptions)).toEqual([""]);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(inputs().map(input => input.value)).toEqual(["999", "Otro", ""]);
    });

    it("también con el catálogo aún pendiente sobre un id sin resolver", async () => {
      const user = userEvent.setup();
      const gate = deferred<Opt[]>();
      const loadOptions = vi.fn((_query: string) => gate.promise);
      const onChange = vi.fn();
      render(<DataGrid columns={[column({ loadOptions })]} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
      act(() => inputs()[0]!.focus());
      await user.keyboard("{Enter}");
      expect(inputs()[1]).toHaveFocus();
      await flush();
      expect(queriesOf(loadOptions)).toEqual([""]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("lo escrito con Enter sí busca y escribe", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const loadOptions = makeLoader();
      render(<DataGrid columns={[column({ loadOptions })]} defaultValue={walk} getRowId={rowId} onChange={onChange} />);
      await waitFor(() => expect(inputs()[1]).toHaveValue("Otro"));
      await user.clear(inputs()[2]!);
      await user.type(inputs()[2]!, "Ramo 2");
      await user.keyboard("{Enter}");
      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(countOf(loadOptions, "Ramo 2")).toBe(1);
      expect(lastRows(onChange)[2]!.ramo).toBe(20);
    });
  });

  it("Escape sin modal revierte lo escrito a la etiqueta confirmada", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={stored} getRowId={rowId} />);
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
    await user.type(inputs()[0]!, "xx");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
  });

  it("una celda con error también cierra su modal con un solo Escape y sin tooltip encima", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<DataGridHandle<Row>>();
    render(<DataGrid ref={ref} columns={[column({ loadOptions: makeLoader(), required: true })]} defaultValue={twoEmpty} getRowId={rowId} />);
    act(() => { ref.current?.validate(); });
    await user.type(inputs()[0]!, "ramo");
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await flush();
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
  });

  it("si el foco ya pasó a otra celda, el resultado se escribe en la fila original y una sola vez", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const gate = deferred<Opt[]>();
    const loadOptions = vi.fn((query: string) => query === "Ramo 1" ? gate.promise : Promise.resolve(search(query)));
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await flush();
    await user.type(inputs()[0]!, "Ramo 1");
    await user.tab();
    await user.tab();
    expect(inputs()[1]).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { gate.resolve([catalog[0]!]); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastRows(onChange)[0]!.ramo).toBe(10);
    expect(lastRows(onChange)[1]!.ramo).toBeNull();
    expect(inputs()[1]).toHaveFocus();
    expect(countOf(loadOptions, "Ramo 1")).toBe(1);
  });

  it("Tab con varias coincidencias abre el modal y la selección se escribe una vez", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await user.type(inputs()[1]!, "ramo");
    await user.tab();
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.dblClick(within(within(dialog()).getAllByRole("rowgroup")[1]!).getAllByRole("cell").find(cell => cell.textContent === "Ramo 1")!);
    await waitFor(() => expect(queryDialog()).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastRows(onChange)[1]!.ramo).toBe(10);
  });

  it("un clic en el modal no selecciona la fila del grid que contiene la celda", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} onRowClick={onRowClick} />);
    await user.click(within(inputs()[0]!.closest("td")!).getByRole("button", { name: "Buscar" }));
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.click(within(dialog()).getAllByRole("radio")[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("DataGrid: celda lookup, valor sin resolver", () => {
  it("muestra el valor crudo y luego la etiqueta, sin dejar de ser el mismo input", async () => {
    const gate = deferred<Opt[]>();
    render(<DataGrid columns={[column({ loadOptions: () => gate.promise })]} defaultValue={stored} getRowId={rowId} />);
    const input = inputs()[0]!;
    expect(input).toHaveValue("30");
    await act(async () => { gate.resolve(catalog); });
    expect(inputs()[0]).toBe(input);
    expect(input).toHaveValue("Otro");
  });

  it("lo que el usuario escribe no se pisa si el catálogo llega después", async () => {
    const user = userEvent.setup();
    const gate = deferred<Opt[]>();
    render(<DataGrid columns={[column({ loadOptions: () => gate.promise })]} defaultValue={stored} getRowId={rowId} />);
    await user.clear(inputs()[0]!);
    await user.type(inputs()[0]!, "ram");
    await act(async () => { gate.resolve(catalog); });
    expect(inputs()[0]).toHaveValue("ram");
  });

  it("pasar con Tab por un valor sin resolver no busca el id ni avisa", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const gate = deferred<Opt[]>();
    const loadOptions = vi.fn((_query: string) => gate.promise);
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
    act(() => inputs()[0]!.focus());
    await user.tab();
    await flush();
    expect(queriesOf(loadOptions)).toEqual([""]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("borrar un valor sin resolver confirma null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: () => new Promise<Opt[]>(() => {}) })]} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
    await user.clear(inputs()[0]!);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(lastRows(onChange)[0]!.ramo).toBeNull();
  });

  it("un valor externo sin etiqueta conocida reemplaza al texto anterior", async () => {
    const ref = React.createRef<DataGridHandle<Row>>();
    render(<DataGrid ref={ref} columns={[column({ loadOptions: makeLoader() })]} defaultValue={stored} getRowId={rowId} />);
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
    act(() => ref.current?.patchRow("r-1", { ramo: 999 }));
    await waitFor(() => expect(inputs()[0]).toHaveValue("999"));
    act(() => ref.current?.patchRow("r-1", { ramo: 10 }));
    await waitFor(() => expect(inputs()[0]).toHaveValue("Ramo 1"));
  });

  it("una opción elegida fuera del catálogo conserva su etiqueta", async () => {
    const user = userEvent.setup();
    const hidden: Opt = { value: 77, label: "Oculta" };
    const loadOptions = vi.fn(async (query: string) => query === "" ? catalog : [hidden]);
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={twoEmpty} getRowId={rowId} />);
    await flush();
    await user.type(inputs()[0]!, "ocu");
    await user.tab();
    await waitFor(() => expect(inputs()[0]).toHaveValue("Oculta"));
    await flush();
    expect(inputs()[0]).toHaveValue("Oculta");
  });
});

describe("DataGrid: celda lookup, presentación", () => {
  it("aria-label igual al encabezado, sin label ni mensaje visibles", async () => {
    const ref = React.createRef<DataGridHandle<Row>>();
    render(<DataGrid ref={ref} columns={[column({ loadOptions: makeLoader(), required: true })]} defaultValue={twoEmpty} getRowId={rowId} />);
    const cell = inputs()[0]!.closest("td")!;
    expect(cell.querySelector("label")).toBeNull();
    act(() => { ref.current?.validate(); });
    await waitFor(() => expect(inputs()[0]).toHaveAttribute("aria-invalid", "true"));
    const described = inputs()[0]!.getAttribute("aria-describedby");
    expect(described).toBeTruthy();
    expect(document.getElementById(described!)).toHaveAttribute("hidden");
    expect(inputs()[0]!.closest("td")!.querySelector("p")).toBeNull();
  });

  it("el modal usa lookupColumns y, sin ellas, una columna con la etiqueta", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataGrid columns={[column({ loadOptions: makeLoader() })]} defaultValue={twoEmpty} getRowId={rowId} />);
    await user.click(within(inputs()[0]!.closest("td")!).getByRole("button", { name: "Buscar" }));
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(within(dialog()).getByRole("columnheader", { name: /Ramo/ })).toBeInTheDocument();
    expect(within(dialog()).getByText("Ramo 2")).toBeInTheDocument();
    unmount();

    const lookupColumns: DataGridColumn<Opt>[] = [{ field: "code", header: "Código" }, { field: "label", header: "Nombre" }];
    const col = column({ loadOptions: makeLoader(), lookupColumns });
    render(<DataGrid columns={[col]} defaultValue={twoEmpty} getRowId={rowId} />);
    await user.click(within(inputs()[0]!.closest("td")!).getByRole("button", { name: "Buscar" }));
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(within(dialog()).getByRole("columnheader", { name: /Código/ })).toBeInTheDocument();
    expect(within(dialog()).getByText("R2")).toBeInTheDocument();
  });

  it("editorProps llega al campo sin quitarle a la celda la selección ni el aria-label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions: makeLoader(), editorProps: { placeholder: "Busque", onOpenChange, "aria-label": "otro" } })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    expect(inputs()[0]).toHaveAttribute("placeholder", "Busque");
    await user.click(within(inputs()[0]!.closest("td")!).getByRole("button", { name: "Buscar" }));
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("un fallo de búsqueda marca la celda y el siguiente intento vuelve a llamar", async () => {
    const user = userEvent.setup();
    const loadOptions = vi.fn(async (query: string) => search(query));
    loadOptions.mockImplementationOnce(async query => search(query)).mockRejectedValueOnce(new Error("red"));
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={twoEmpty} getRowId={rowId} onChange={onChange} />);
    await flush();
    await user.type(inputs()[0]!, "otro");
    await user.keyboard("{Tab}");
    await waitFor(() => expect(inputs()[0]).toHaveAttribute("aria-invalid", "true"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(inputs()[0]!);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(lastRows(onChange)[0]!.ramo).toBe(30);
    expect(inputs()[0]).not.toHaveAttribute("aria-invalid", "true");
    expect(countOf(loadOptions, "otro")).toBe(2);
  });
});

describe("DataGrid: columna lookup, lectura, orden y filtro", () => {
  it("las filas muestran la etiqueta del catálogo con una sola carga y marca de pendiente mientras llega", async () => {
    const gate = deferred<Opt[]>();
    const loadOptions = vi.fn((_query: string) => gate.promise);
    render(<DataGrid columns={[readColumn({ loadOptions })]} value={stored} getRowId={rowId} />);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    expect(loadOptions).toHaveBeenCalledWith("");
    expect(bodyCells()[0]).toHaveTextContent("30");
    expect(bodyCells()[0]!.querySelector("[data-pending]")).not.toBeNull();
    await act(async () => { gate.resolve(catalog); });
    expect(bodyCells()[0]).toHaveTextContent("Otro");
    expect(bodyCells()[0]!.querySelector("[data-pending]")).toBeNull();
  });

  it("filtrar por la etiqueta encuentra filas cuyo valor guardado es un id, y el id no coincide", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[readColumn({ loadOptions: makeLoader() })]} value={stored} getRowId={rowId} />);
    await waitFor(() => expect(bodyCells()[0]).toHaveTextContent("Otro"));
    const apply = async (text: string) => {
      await user.click(screen.getByRole("button", { name: /^(Filtrar|Filtro activo en) Ramo$/ }));
      const menu = await screen.findByRole("dialog", { name: "Filtrar Ramo" });
      const input = within(menu).getByRole("textbox", { name: "Filtrar Ramo" });
      await user.clear(input);
      await user.type(input, text);
      await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    };
    await apply("ramo");
    await waitFor(() => expect(bodyCells()).toHaveLength(1));
    expect(bodyCells()[0]).toHaveTextContent("Ramo 1");
    await apply("10");
    await waitFor(() => expect(screen.getByText("Sin resultados para los filtros aplicados")).toBeInTheDocument());
  });

  it("ordenar compara por la etiqueta, como el select remoto", async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={[readColumn({ loadOptions: makeLoader() })]} value={stored} getRowId={rowId} />);
    await waitFor(() => expect(bodyCells()[0]).toHaveTextContent("Otro"));
    await user.click(screen.getByRole("button", { name: "Ordenar por Ramo" }));
    expect(bodyCells().map(cell => cell.textContent)).toEqual(["Otro", "Ramo 1"]);
    await user.click(screen.getByRole("button", { name: "Ordenar por Ramo" }));
    expect(bodyCells().map(cell => cell.textContent)).toEqual(["Ramo 1", "Otro"]);
  });

  it("cellTypes.lookup del consumidor gana y loadOptions no recibe búsquedas del editor interno", async () => {
    const user = userEvent.setup();
    const loadOptions = makeLoader();
    const MiLookup: DataGridCellComponent<Row> = ({ value, onCommit }) => <button onClick={() => onCommit(20)}>mío {String(value)}</button>;
    const onChange = vi.fn();
    render(<DataGrid columns={[column({ loadOptions })]} cellTypes={{ lookup: MiLookup }} defaultValue={stored} getRowId={rowId} onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Buscar" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Ramo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "mío 30" }));
    expect(lastRows(onChange)[0]!.ramo).toBe(20);
    await flush();
    expect(queriesOf(loadOptions).filter(query => query !== "")).toEqual([]);
  });
});

describe("DataGrid: reintento del catálogo de una columna lookup", () => {
  it("un catálogo fallido se reintenta al cambiar las filas y entonces resuelve las etiquetas", async () => {
    const loadOptions = vi.fn(async (query: string) => search(query));
    loadOptions.mockRejectedValueOnce(new Error("red"));
    const { rerender } = render(<DataGrid columns={[readColumn({ loadOptions })]} value={stored} getRowId={rowId} />);
    await flush();
    expect(bodyCells()[0]).toHaveTextContent("30");
    expect(countOf(loadOptions, "")).toBe(1);
    rerender(<DataGrid columns={[readColumn({ loadOptions })]} value={[...stored]} getRowId={rowId} />);
    await waitFor(() => expect(bodyCells()[0]).toHaveTextContent("Otro"));
    expect(countOf(loadOptions, "")).toBe(2);
  });

  it("un fallo persistente hace como mucho un reintento por cambio de filas y no entra en bucle", async () => {
    const loadOptions = vi.fn(async (_query: string): Promise<Opt[]> => { throw new Error("red"); });
    const col = [readColumn({ loadOptions })];
    const { rerender } = render(<DataGrid columns={col} value={stored} getRowId={rowId} />);
    await flush(60);
    expect(countOf(loadOptions, "")).toBe(1);
    rerender(<DataGrid columns={[...col]} value={stored} getRowId={rowId} density="compact" />);
    await flush(60);
    expect(countOf(loadOptions, "")).toBe(1);
    for (let change = 1; change <= 3; change += 1) {
      rerender(<DataGrid columns={col} value={[...stored]} getRowId={rowId} />);
      await flush(60);
      expect(countOf(loadOptions, "")).toBe(1 + change);
    }
    await flush(100);
    expect(countOf(loadOptions, "")).toBe(4);
    expect(bodyCells()[0]).toHaveTextContent("30");
    expect(bodyCells()[0]!.querySelector("[data-pending]")).toBeNull();
  });

  it("cambios de filas seguidos con un reintento en curso comparten la misma llamada", async () => {
    const gates: Array<ReturnType<typeof deferred<Opt[]>>> = [];
    const loadOptions = vi.fn((_query: string) => { const gate = deferred<Opt[]>(); gates.push(gate); return gate.promise; });
    const col = [readColumn({ loadOptions })];
    const { rerender } = render(<DataGrid columns={col} value={stored} getRowId={rowId} />);
    await act(async () => { gates[0]!.reject(new Error("red")); });
    rerender(<DataGrid columns={col} value={[...stored]} getRowId={rowId} />);
    rerender(<DataGrid columns={col} value={[...stored]} getRowId={rowId} />);
    await flush();
    expect(loadOptions).toHaveBeenCalledTimes(2);
    await act(async () => { gates[1]!.resolve(catalog); });
    expect(bodyCells()[0]).toHaveTextContent("Otro");
  });

  it("una columna lookup editable con el catálogo fallido se recupera igual", async () => {
    const loadOptions = vi.fn(async (query: string) => search(query));
    loadOptions.mockRejectedValueOnce(new Error("red"));
    const col = [column({ loadOptions })];
    const { rerender } = render(<DataGrid columns={col} value={stored} getRowId={rowId} />);
    await flush();
    expect(inputs()[0]).toHaveValue("30");
    rerender(<DataGrid columns={col} value={[...stored]} getRowId={rowId} />);
    await waitFor(() => expect(inputs()[0]).toHaveValue("Otro"));
  });

  it("Tab sobre un valor sin resolver con el catálogo fallido no vuelve a llamar", async () => {
    const loadOptions = vi.fn(async (_query: string): Promise<Opt[]> => { throw new Error("red"); });
    render(<DataGrid columns={[column({ loadOptions })]} defaultValue={stored} getRowId={rowId} />);
    await flush();
    fireEvent.keyDown(inputs()[0]!, { key: "Tab" });
    await flush();
    expect(queriesOf(loadOptions)).toEqual([""]);
  });
});
