import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LookupDialog, type LookupDialogProps } from "./LookupDialog";
import type { DataGridColumn } from "../data-grid/DataGrid.types";
import { entityLookupMessagesEs } from "./lookup-core.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});
afterEach(cleanup);

type Item = { id: string; name: string };
const item = (n: number): Item => ({ id: `i-${n}`, name: `Nombre ${n}` });
const makeItems = (from: number, count: number) => Array.from({ length: count }, (_, i) => item(from + i));
const columns: DataGridColumn<Item>[] = [{ field: "name", header: "Nombre" }];
const messages = { accept: entityLookupMessagesEs.accept, dialogTitle: entityLookupMessagesEs.dialogTitle };

function setup(over: Partial<LookupDialogProps<Item>> = {}) {
  const props: LookupDialogProps<Item> = {
    open: true, onOpenChange: vi.fn(), columns, rows: makeItems(1, 3), total: null, page: 1, pageSize: 50, loading: false, remote: false,
    getItemId: i => i.id, onConfirm: vi.fn(), onPageChange: vi.fn(), messages, ...over,
  };
  const view = render(<LookupDialog {...props} />);
  const rerender = (next: Partial<LookupDialogProps<Item>>) => view.rerender(<LookupDialog {...props} {...next} />);
  return { props, rerender, user: userEvent.setup() };
}
const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("row");
const radio = (index: number) => within(bodyRows()[index]!).getByRole("radio", { name: "Seleccionar fila" });
const accept = () => screen.getByRole("button", { name: "Aceptar" });

describe("LookupDialog", () => {
  it("usa el título por defecto y el tamaño lg", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Seleccionar elemento" });
    expect(dialog).toHaveStyle({ width: "1000px" });
  });

  it("doble clic en una fila confirma ese item", async () => {
    const { props, user } = setup();
    await user.dblClick(within(bodyRows()[1]!).getByText("Nombre 2"));
    expect(props.onConfirm).toHaveBeenCalledWith(item(2));
  });

  it("Aceptar está deshabilitado sin selección y confirma la fila elegida", async () => {
    const { props, user } = setup();
    expect(accept()).toBeDisabled();
    await user.click(within(bodyRows()[2]!).getByText("Nombre 3"));
    expect(accept()).toBeEnabled();
    await user.click(accept());
    expect(props.onConfirm).toHaveBeenCalledWith(item(3));
  });

  it("preselectedId marca la fila al abrir y habilita Aceptar", () => {
    setup({ preselectedId: "i-2" });
    expect(radio(1)).toBeChecked();
    expect(accept()).toBeEnabled();
  });

  it("una preselección fuera de las filas deja Aceptar deshabilitado", () => {
    setup({ preselectedId: "i-99" });
    expect(accept()).toBeDisabled();
  });

  it("al reabrir reinicia la selección y aplica preselectedId", async () => {
    const { rerender, user } = setup();
    await user.click(within(bodyRows()[0]!).getByText("Nombre 1"));
    expect(accept()).toBeEnabled();
    rerender({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender({ open: true });
    expect(accept()).toBeDisabled();
    rerender({ open: false });
    rerender({ open: true, preselectedId: "i-3" });
    expect(radio(2)).toBeChecked();
  });

  it("un teclado llega a las filas con Tab, se mueve con flechas y Enter confirma la fila activa", async () => {
    const { props, user } = setup();
    const dialog = screen.getByRole("dialog", { name: "Seleccionar elemento" });
    for (let i = 0; i < 10 && !(document.activeElement instanceof HTMLInputElement && document.activeElement.type === "radio"); i++) await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(radio(0));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radio(1));
    await user.keyboard("{Enter}");
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).toHaveBeenCalledWith(item(2));
  });

  it("Enter sobre la fila ya seleccionada la confirma", async () => {
    const { props, user } = setup({ preselectedId: "i-3" });
    radio(2).focus();
    await user.keyboard("{Enter}");
    expect(props.onConfirm).toHaveBeenCalledWith(item(3));
  });

  it("Enter en el paginador no confirma", async () => {
    const { props, user } = setup({ remote: true, total: 25, pageSize: 10, rows: makeItems(1, 10), preselectedId: "i-1" });
    screen.getByRole("button", { name: "Página siguiente" }).focus();
    await user.keyboard("{Enter}");
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("Enter en el menú de filtro no confirma", async () => {
    const { props, user } = setup({ preselectedId: "i-1" });
    await user.click(screen.getByRole("button", { name: "Filtrar Nombre" }));
    const menu = await screen.findByRole("dialog", { name: "Filtrar Nombre" });
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Nombre" }), "2{Enter}");
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("footerExtra se pinta antes de Aceptar", () => {
    setup({ footerExtra: <button type="button">Cancelar</button> });
    const buttons = screen.getAllByRole("button").map(b => b.textContent);
    expect(buttons.indexOf("Cancelar")).toBeGreaterThan(-1);
    expect(buttons.indexOf("Cancelar")).toBeLessThan(buttons.indexOf("Aceptar"));
  });

  it("en cliente se puede filtrar desde el encabezado", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Filtrar Nombre" }));
    const menu = await screen.findByRole("dialog", { name: "Filtrar Nombre" });
    await user.type(within(menu).getByRole("textbox", { name: "Filtrar Nombre" }), "Nombre 2");
    await user.click(within(menu).getByRole("button", { name: "Aplicar" }));
    expect(bodyRows()).toHaveLength(1);
  });

  it("Escape con el menú de filtro abierto cierra solo el menú; sin menú cierra el diálogo", async () => {
    const { props, user } = setup();
    await user.click(screen.getByRole("button", { name: "Filtrar Nombre" }));
    await screen.findByRole("dialog", { name: "Filtrar Nombre" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Filtrar Nombre" })).toBeNull();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("el foco queda atrapado en el diálogo", async () => {
    const { user } = setup();
    const dialog = screen.getByRole("dialog", { name: "Seleccionar elemento" });
    for (let i = 0; i < 25; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("loading con filas conserva las filas y el diálogo abierto", () => {
    setup({ loading: true });
    expect(screen.getByRole("dialog", { name: "Seleccionar elemento" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
  });

  describe("remote", () => {
    const remoteProps = { remote: true, total: 25, pageSize: 10 } as const;
    function Remote({ onPageChange }: { onPageChange: (page: number, pageSize: number) => void }) {
      const [page, setPage] = React.useState(1);
      return <LookupDialog<Item> open onOpenChange={() => {}} columns={columns} rows={makeItems((page - 1) * 10 + 1, 10)} total={25} page={page} pageSize={10} loading={false} remote
        getItemId={i => i.id} onConfirm={() => {}} onPageChange={(p, s) => { onPageChange(p, s); setPage(p); }} messages={messages} />;
    }

    it("oculta los iconos de filtro y no emite consulta al montar", () => {
      const { props } = setup({ ...remoteProps, rows: makeItems(1, 10) });
      expect(screen.queryByRole("button", { name: /^Filtrar/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Ordenar/ })).toBeNull();
      expect(props.onPageChange).not.toHaveBeenCalled();
    });

    it("Página siguiente llama a onPageChange(2, pageSize)", async () => {
      const onPageChange = vi.fn();
      render(<Remote onPageChange={onPageChange} />);
      expect(onPageChange).not.toHaveBeenCalled();
      await userEvent.setup().click(screen.getByRole("button", { name: "Página siguiente" }));
      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(2, 10);
    });

    it("la primera consulta usa pageSize como tamaño de página de la grilla", () => {
      setup({ ...remoteProps, pageSize: 7, rows: makeItems(1, 7), total: 30 });
      expect(screen.getByText(/1.*7.*30/)).toBeInTheDocument();
    });

    it("una selección de otra página no habilita Aceptar ni confirma otro item", async () => {
      const { props, rerender, user } = setup({ ...remoteProps, rows: makeItems(1, 10) });
      await user.click(within(bodyRows()[0]!).getByText("Nombre 1"));
      expect(accept()).toBeEnabled();
      rerender({ ...remoteProps, rows: makeItems(11, 10), page: 2 });
      expect(accept()).toBeDisabled();
      await user.click(accept());
      expect(props.onConfirm).not.toHaveBeenCalled();
    });
  });
});
