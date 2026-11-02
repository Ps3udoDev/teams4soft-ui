import * as React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataGrid } from "./DataGrid";
import type { DataGridColumn, DataGridQuery } from "./DataGrid.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});

// jsdom no suelta el foco de un control deshabilitado ni de un subárbol inert, como sí hace el navegador:
// se imita al instante, en el mismo commit, con focusout ya sobre el control deshabilitado.
const realSetAttribute = Element.prototype.setAttribute;
beforeEach(() => {
  Element.prototype.setAttribute = function patched(this: Element, name: string, value: string) {
    realSetAttribute.call(this, name, value);
    const active = document.activeElement;
    if ((name === "disabled" || name === "inert") && active && active !== document.body && this.contains(active)) {
      // blur() no actúa sobre un control deshabilitado en jsdom; enfocar el body sí suelta el foco.
      document.body.tabIndex = -1;
      document.body.focus();
      document.body.removeAttribute("tabindex");
    }
  };
});
afterEach(() => { Element.prototype.setAttribute = realSetAttribute; });
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

type Row = { id: string; policy: string; amount: number };
const columns: DataGridColumn<Row>[] = [
  { field: "policy", header: "Póliza", filter: "text" },
  { field: "amount", header: "Importe", type: "number" },
];
const getRowId = (row: Row) => row.id;
const pageRows = (pageIndex: number, pageSize: number): Row[] => Array.from({ length: pageSize }, (_, i) => {
  const n = pageIndex * pageSize + i + 1;
  return { id: `r-${n}`, policy: `Pol ${n}`, amount: n };
});

// Cada consulta deja la grilla cargando hasta que el test libera su respuesta.
function setup(total = 20) {
  const gates: Array<() => void> = [];
  function Parent() {
    const [value, setValue] = React.useState(() => pageRows(0, 10));
    const [loading, setLoading] = React.useState(false);
    const mounted = React.useRef(false);
    const onQueryChange = React.useCallback((query: DataGridQuery) => {
      // La consulta de montaje ya tiene su página.
      if (!mounted.current) { mounted.current = true; return; }
      setLoading(true);
      gates.push(() => { setValue(pageRows(query.pageIndex, query.pageSize)); setLoading(false); });
    }, []);
    const serverSide = React.useMemo(() => ({ totalRecords: total, onQueryChange }), [onQueryChange]);
    return <>
      <input aria-label="Externo" />
      <DataGrid columns={columns} getRowId={getRowId} value={value} loading={loading} serverSide={serverSide} />
    </>;
  }
  render(<Parent />);
  const release = () => act(() => { gates.shift()?.(); });
  return { release };
}
const button = (name: string) => screen.getByRole("button", { name });

describe("DataGrid: el foco sobrevive a una carga del servidor", () => {
  it("página siguiente: el foco vuelve al botón y un segundo Enter avanza", async () => {
    const user = userEvent.setup();
    const { release } = setup(60);
    button("Página siguiente").focus();
    await user.keyboard("{Enter}");
    await flush();
    expect(button("Página siguiente")).toBeDisabled();
    release();
    expect(screen.getByText("Página 2 de 6")).toBeInTheDocument();
    expect(document.activeElement).toBe(button("Página siguiente"));
    await user.keyboard("{Enter}");
    await flush();
    release();
    expect(screen.getByText("Página 3 de 6")).toBeInTheDocument();
    expect(document.activeElement).toBe(button("Página siguiente"));
  });

  it("orden: el foco vuelve al botón de orden", async () => {
    const user = userEvent.setup();
    const { release } = setup();
    await user.click(button("Ordenar por Importe"));
    await flush();
    release();
    expect(document.activeElement).toBe(button("Ordenar por Importe"));
  });

  it("filtro: Aplicar deja el foco en el botón del filtro", async () => {
    const user = userEvent.setup();
    const { release } = setup();
    await user.click(screen.getByRole("button", { name: "Filtrar Póliza" }));
    const menu = await screen.findByRole("dialog", { name: "Filtrar Póliza" });
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Póliza" }), "Pol");
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    await flush();
    release();
    await flush();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^(Filtrar|Filtro activo en) Póliza$/ }));
  });

  it("tamaño de página: el foco vuelve al selector", async () => {
    const user = userEvent.setup();
    const { release } = setup();
    await user.selectOptions(screen.getByLabelText("Filas por página"), "25");
    await flush();
    release();
    expect(document.activeElement).toBe(screen.getByLabelText("Filas por página"));
  });

  it("última página: si el botón queda deshabilitado, el foco pasa a Página anterior", async () => {
    const user = userEvent.setup();
    const { release } = setup(20);
    await user.click(button("Página siguiente"));
    await flush();
    release();
    expect(button("Página siguiente")).toBeDisabled();
    expect(document.activeElement).toBe(button("Página anterior"));
  });

  it("no roba el foco si el usuario lo movió durante la carga", async () => {
    const user = userEvent.setup();
    const { release } = setup(60);
    await user.click(button("Página siguiente"));
    await flush();
    screen.getByLabelText("Externo").focus();
    release();
    expect(document.activeElement).toBe(screen.getByLabelText("Externo"));
  });

  it("si el foco estaba fuera de la grilla al empezar la carga, no hace nada", async () => {
    const { release } = setup(60);
    screen.getByLabelText("Externo").focus();
    // El clic programático no mueve el foco: sigue en el campo externo.
    await act(async () => { button("Página siguiente").click(); });
    await flush();
    expect(document.activeElement).toBe(screen.getByLabelText("Externo"));
    release();
    expect(document.activeElement).toBe(screen.getByLabelText("Externo"));
  });
});

describe("DataGrid: el foco en modo cliente con loading", () => {
  const editable: DataGridColumn<Row>[] = [{ field: "policy", header: "Póliza", editable: true }, columns[1]!];
  const rows = pageRows(0, 25);

  it("el paginador recupera el foco al terminar la carga", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataGrid columns={columns} getRowId={getRowId} value={rows} />);
    await user.click(button("Página siguiente"));
    rerender(<DataGrid columns={columns} getRowId={getRowId} value={rows} loading />);
    await flush();
    expect(document.activeElement).toBe(document.body);
    rerender(<DataGrid columns={columns} getRowId={getRowId} value={rows} />);
    expect(document.activeElement).toBe(button("Página siguiente"));
  });

  it("un editor enfocado recupera el foco cuando termina un refresco con loading", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DataGrid columns={editable} getRowId={getRowId} value={rows} />);
    const input = screen.getAllByRole("textbox", { name: "Póliza" })[0]!;
    await user.click(input);
    expect(input).toHaveFocus();
    rerender(<DataGrid columns={editable} getRowId={getRowId} value={rows} loading />);
    await flush();
    expect(document.activeElement).toBe(document.body);
    rerender(<DataGrid columns={editable} getRowId={getRowId} value={rows.map(row => ({ ...row }))} />);
    expect(screen.getAllByRole("textbox", { name: "Póliza" })[0]).toBe(input);
    expect(input).toHaveFocus();
  });
});
