import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityLookupField } from "./EntityLookupField";
import type { EntityLookupFieldProps } from "./EntityLookupField.types";
import type { DataGridColumn } from "../data-grid/DataGrid.types";
import type { LookupSearchResponse } from "../lookup-core/lookup-core.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});
afterEach(cleanup);

type Prov = { id: number; name: string; code: string };
const prov = (n: number): Prov => ({ id: n, name: `Proveedor ${n}`, code: `C${n}` });
const provs = (from: number, count: number) => Array.from({ length: count }, (_, i) => prov(from + i));
const columns: DataGridColumn<Prov>[] = [{ field: "name", header: "Nombre" }, { field: "code", header: "Código" }];

type Over = Partial<EntityLookupFieldProps<Prov>> & { initial?: Prov | null };

function Harness({ initial = null, onSelectionChange, ...rest }: Over) {
  const [selected, setSelected] = React.useState<Prov | null>(initial);
  return (
    <EntityLookupField<Prov>
      label="Proveedor"
      selectedItem={selected}
      onSelectionChange={(item) => { setSelected(item); onSelectionChange?.(item); }}
      getItemId={(p) => p.id}
      getItemLabel={(p) => p.name}
      columns={columns}
      {...rest}
    />
  );
}

function setup(over: Over = {}) {
  const onSelectionChange = vi.fn();
  const view = render(<Harness onSelectionChange={onSelectionChange} {...over} />);
  return { onSelectionChange, user: userEvent.setup(), view };
}

const input = () => screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;
const trigger = () => screen.getByRole("button", { name: "Buscar" });
const root = () => input().closest("[data-state]") as HTMLElement;
const dialog = () => screen.getByRole("dialog", { name: "Seleccionar elemento" });
const bodyRows = () => within(within(dialog()).getAllByRole("rowgroup")[1]!).getAllByRole("row");
const accept = () => within(dialog()).getByRole("button", { name: "Aceptar" });

function remote(response: (query: string, page: number) => LookupSearchResponse<Prov>) {
  return vi.fn(async (query: string, ctx: { page: number }) => response(query, ctx.page));
}

describe("EntityLookupField remoto", () => {
  it("un resultado se selecciona sin abrir el modal", async () => {
    const search = remote(() => [prov(1)]);
    const { user, onSelectionChange } = setup({ search });
    await user.type(input(), "prov{Enter}");
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(prov(1)));
    expect(search).toHaveBeenCalledWith("prov", expect.objectContaining({ page: 1, pageSize: 50 }));
    expect(input()).toHaveValue("Proveedor 1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("varios resultados abren el modal y Aceptar selecciona la fila elegida", async () => {
    const search = remote(() => provs(1, 3));
    const { user, onSelectionChange } = setup({ search });
    await user.type(input(), "prov{Enter}");
    expect(await screen.findByRole("dialog", { name: "Seleccionar elemento" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
    expect(accept()).toBeDisabled();
    await user.click(within(bodyRows()[1]!).getByText("Proveedor 2"));
    await user.click(accept());
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(prov(2));
    expect(input()).toHaveValue("Proveedor 2");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cero resultados sin onCreateRequest avisa y aceptar limpia el texto", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => []) });
    await user.type(input(), "zz{Enter}");
    expect(await screen.findByText("No se encontró «zz»")).toBeInTheDocument();
    expect(input()).toHaveValue("zz");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(input()).toHaveValue(""));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("cero resultados con selección y texto sucio: descartar llama onSelectionChange(null) una vez", async () => {
    const search = remote((q) => (q.includes("zz") ? [] : [prov(1)]));
    const { user, onSelectionChange } = setup({ search, initial: prov(1) });
    await user.type(input(), "zz{Enter}");
    await user.click(await screen.findByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(input()).toHaveValue(""));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it("cero resultados con onCreateRequest: Sí crea y deja el texto; No no cambia nada", async () => {
    const onCreateRequest = vi.fn();
    const { user, onSelectionChange } = setup({ search: remote(() => []), onCreateRequest });
    await user.type(input(), "zz{Enter}");
    await user.click(await screen.findByRole("button", { name: "No" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onCreateRequest).not.toHaveBeenCalled();
    expect(input()).toHaveValue("zz");
    await user.type(input(), "{Enter}");
    await user.click(await screen.findByRole("button", { name: "Sí, crear nuevo" }));
    await waitFor(() => expect(onCreateRequest).toHaveBeenCalledWith("zz"));
    expect(input()).toHaveValue("zz");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("\"…\" vacío busca con página 1 y abre el modal", async () => {
    const search = remote(() => provs(1, 3));
    const { user } = setup({ search });
    await user.click(trigger());
    expect(await screen.findByRole("dialog", { name: "Seleccionar elemento" })).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("", expect.objectContaining({ page: 1, pageSize: 50 }));
    expect(accept()).toBeDisabled();
  });

  it("\"…\" vacío con respuesta vacía pide un término", async () => {
    const { user } = setup({ search: remote(() => []) });
    await user.click(trigger());
    expect(await screen.findByText("Ingrese un término de búsqueda para continuar.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Seleccionar elemento" })).toBeNull();
  });

  it("\"…\" con la selección vigente busca todo y preselecciona su fila", async () => {
    const search = remote(() => provs(1, 3));
    const { user } = setup({ search, initial: prov(2) });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(search).toHaveBeenCalledWith("", expect.objectContaining({ page: 1 }));
    expect(within(bodyRows()[1]!).getByRole("radio")).toBeChecked();
    expect(accept()).toBeEnabled();
  });

  it("paginación del servidor: la página 2 conserva el término y no repite la búsqueda al abrir", async () => {
    const search = remote((_q, page) => ({ items: provs((page - 1) * 10 + 1, 10), total: 25 }));
    const { user } = setup({ search, pageSize: 10 });
    await user.type(input(), "prov{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(search).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(search).toHaveBeenLastCalledWith("prov", expect.objectContaining({ page: 2, pageSize: 10 }));
    await waitFor(() => expect(within(bodyRows()[0]!).getByText("Proveedor 11")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^Filtrar/ })).toBeNull();
  });

  it("una búsqueda que lanza llama onSearchError y conserva el texto", async () => {
    const error = new Error("boom");
    const onSearchError = vi.fn();
    const { user } = setup({ search: vi.fn(async () => { throw error; }), onSearchError });
    await user.type(input(), "abc{Enter}");
    await waitFor(() => expect(onSearchError).toHaveBeenCalledWith(error));
    expect(input()).toHaveValue("abc");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Enter con texto vacío no busca", async () => {
    const search = remote(() => provs(1, 3));
    const { user } = setup({ search });
    input().focus();
    await user.keyboard("{Enter}");
    expect(search).not.toHaveBeenCalled();
  });
});

describe("EntityLookupField teclado y foco", () => {
  it("Enter nunca envía el formulario, ni siquiera vacío", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(<form onSubmit={onSubmit}><Harness search={remote(() => provs(1, 3))} /><button type="submit">Enviar</button></form>);
    input().focus();
    await user.keyboard("{Enter}");
    await user.type(input(), "a{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Tab con texto sucio busca sin impedir el movimiento del foco", async () => {
    const search = remote(() => [prov(1)]);
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<><Harness search={search} onSelectionChange={onSelectionChange} clearable={false} trailingActions={<button type="button">Siguiente</button>} /></>);
    await user.type(input(), "prov");
    await user.tab();
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(prov(1)));
    expect(search).toHaveBeenCalledTimes(1);
    expect(input()).toHaveValue("Proveedor 1");
    expect(document.activeElement).not.toBe(input());
  });

  it("Tab sin texto o con texto igual a la selección no busca", async () => {
    const search = remote(() => provs(1, 3));
    const user = userEvent.setup();
    render(<Harness search={search} initial={prov(1)} />);
    input().focus();
    await user.tab();
    expect(search).not.toHaveBeenCalled();
    cleanup();
    render(<Harness search={search} />);
    input().focus();
    await user.tab();
    expect(search).not.toHaveBeenCalled();
  });

  it("al cerrar el modal con Aceptar el foco vuelve al input", async () => {
    const { user } = setup({ search: remote(() => provs(1, 3)) });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.click(within(bodyRows()[0]!).getByText("Proveedor 1"));
    await user.click(accept());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(input());
  });

  it("al cerrar el modal con Escape el foco vuelve al input", async () => {
    const { user } = setup({ search: remote(() => provs(1, 3)) });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(input());
  });

  it("si el modal se abre desde Tab, al cerrarlo el foco vuelve al input", async () => {
    const user = userEvent.setup();
    render(<><Harness search={remote(() => provs(1, 3))} /><button type="button">Otro</button></>);
    await user.type(input(), "prov");
    await user.tab();
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(input());
  });
});

describe("EntityLookupField estado y selección", () => {
  it("data-state: idle, dirty al escribir, resolved al seleccionar; el hint solo en resolved", async () => {
    const { user } = setup({ search: remote(() => [prov(1)]), showSelectedHint: true });
    expect(root()).toHaveAttribute("data-state", "idle");
    await user.type(input(), "pr");
    expect(root()).toHaveAttribute("data-state", "dirty");
    await user.type(input(), "{Enter}");
    await waitFor(() => expect(root()).toHaveAttribute("data-state", "resolved"));
    expect(screen.getByText("Seleccionado")).toBeInTheDocument();
    await user.type(input(), "x");
    expect(root()).toHaveAttribute("data-state", "dirty");
    expect(screen.queryByText("Seleccionado")).toBeNull();
  });

  it("escribir sobre una selección no cambia selectedItem hasta resolver", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => provs(1, 2)), initial: prov(1) });
    await user.type(input(), "x");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("el botón limpiar llama onSelectionChange(null) una vez", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => provs(1, 2)), initial: prov(1), clearable: true });
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
    expect(input()).toHaveValue("");
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("limpiar sin selección no llama onSelectionChange", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => provs(1, 2)), clearable: true });
    await user.type(input(), "ab");
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("vaciar escribiendo llama onSelectionChange(null) una vez, solo si había selección", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => provs(1, 2)), initial: prov(1) });
    await user.clear(input());
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it("el texto inicial es la etiqueta de selectedItem", () => {
    setup({ search: remote(() => []), initial: prov(3) });
    expect(input()).toHaveValue("Proveedor 3");
    expect(root()).toHaveAttribute("data-state", "resolved");
  });

  it("un cambio externo de selectedItem sincroniza el texto, incluido null", () => {
    const base = { onSelectionChange: () => {}, getItemId: (p: Prov) => p.id, getItemLabel: (p: Prov) => p.name, columns };
    const { rerender } = render(<EntityLookupField<Prov> selectedItem={prov(1)} {...base} />);
    expect(input()).toHaveValue("Proveedor 1");
    rerender(<EntityLookupField<Prov> selectedItem={prov(2)} {...base} />);
    expect(input()).toHaveValue("Proveedor 2");
    rerender(<EntityLookupField<Prov> selectedItem={null} {...base} />);
    expect(input()).toHaveValue("");
  });

  it("un objeto nuevo con el mismo id no pisa el texto escrito", async () => {
    const user = userEvent.setup();
    const base = { onSelectionChange: () => {}, getItemId: (p: Prov) => p.id, getItemLabel: (p: Prov) => p.name, columns };
    const { rerender } = render(<EntityLookupField<Prov> selectedItem={prov(1)} {...base} />);
    await user.type(input(), " extra");
    rerender(<EntityLookupField<Prov> selectedItem={{ ...prov(1) }} {...base} />);
    expect(input()).toHaveValue("Proveedor 1 extra");
  });

  it("inputValue controlado y onInputValueChange", async () => {
    const onInputValueChange = vi.fn();
    const user = userEvent.setup();
    render(<EntityLookupField<Prov> selectedItem={null} onSelectionChange={() => {}} getItemId={(p) => p.id} getItemLabel={(p) => p.name} columns={columns}
      inputValue="fijo" onInputValueChange={onInputValueChange} />);
    await user.type(input(), "a");
    expect(onInputValueChange).toHaveBeenCalledWith("fijoa");
    expect(input()).toHaveValue("fijo");
  });
});

describe("EntityLookupField onTriggerClick, disabled, loading", () => {
  it("\"…\" y Enter llaman onTriggerClick en vez de buscar; Tab y blur no buscan", async () => {
    const search = remote(() => provs(1, 3));
    const onTriggerClick = vi.fn();
    const user = userEvent.setup();
    render(<><Harness search={search} onTriggerClick={onTriggerClick} resolveOnBlur /><button type="button">Otro</button></>);
    await user.click(trigger());
    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    await user.type(input(), "ab{Enter}");
    expect(onTriggerClick).toHaveBeenCalledTimes(2);
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Otro" }));
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disabled y readOnly: ningún disparador busca y el botón está deshabilitado", async () => {
    const search = remote(() => provs(1, 3));
    const user = userEvent.setup();
    render(<Harness search={search} disabled />);
    expect(trigger()).toBeDisabled();
    cleanup();
    render(<Harness search={search} readOnly initial={null} />);
    expect(trigger()).toBeDisabled();
    input().focus();
    await user.keyboard("{Enter}");
    await user.tab();
    expect(search).not.toHaveBeenCalled();
  });

  it("loading muestra data-loading y el spinner sin deshabilitar nada", () => {
    setup({ items: provs(1, 3), loading: true });
    expect(root()).toHaveAttribute("data-loading", "true");
    expect(trigger()).toBeEnabled();
    expect(input()).toBeEnabled();
  });

  it("mientras busca muestra data-loading", async () => {
    let resolve!: (value: Prov[]) => void;
    const search = vi.fn(() => new Promise<Prov[]>((r) => { resolve = r; }));
    const { user } = setup({ search });
    await user.type(input(), "a{Enter}");
    await waitFor(() => expect(root()).toHaveAttribute("data-loading", "true"));
    await act(async () => { resolve([prov(1)]); });
    await waitFor(() => expect(root()).not.toHaveAttribute("data-loading"));
  });

  it("el botón tiene aria-label de los mensajes y se pueden sobreescribir", () => {
    setup({ items: [], messages: { trigger: "Abrir catálogo" } });
    expect(screen.getByRole("button", { name: "Abrir catálogo" })).toBeInTheDocument();
  });

  it("trailingActions se pinta tras el botón", () => {
    setup({ items: [], trailingActions: <button type="button">Extra</button> });
    const names = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names.indexOf("Extra")).toBeGreaterThan(names.indexOf("Buscar"));
  });
});

describe("EntityLookupField local", () => {
  const items = [prov(1), prov(2), { id: 3, name: "Otro", code: "ZZ9" }];

  it("Enter con texto abre el modal aunque haya una sola coincidencia", async () => {
    const { user, onSelectionChange } = setup({ items });
    await user.type(input(), "otro{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(bodyRows()).toHaveLength(1);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("filtra por searchKeys, por defecto los field de las columnas", async () => {
    const { user } = setup({ items });
    await user.type(input(), "zz9{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(bodyRows()).toHaveLength(1);
    cleanup();
    const second = setup({ items, searchKeys: ["name"] });
    await second.user.type(input(), "zz9{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(within(dialog()).queryAllByRole("radio")).toHaveLength(0);
  });

  it("cero coincidencias abre el modal vacío", async () => {
    const { user } = setup({ items });
    await user.type(input(), "nadaquever{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(screen.queryByText(/No se encontró/)).toBeNull();
  });

  it("\"…\" vacío lista todo y el doble clic selecciona", async () => {
    const { user, onSelectionChange } = setup({ items });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(bodyRows()).toHaveLength(3);
    await user.dblClick(within(bodyRows()[2]!).getByText("Otro"));
    expect(onSelectionChange).toHaveBeenCalledWith(items[2]);
    expect(input()).toHaveValue("Otro");
  });

  it("\"…\" con la selección vigente lista todo con su fila preseleccionada", async () => {
    const { user } = setup({ items, initial: items[1]! });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(bodyRows()).toHaveLength(3);
    expect(within(bodyRows()[1]!).getByRole("radio")).toBeChecked();
  });
});

describe("EntityLookupField modal controlado", () => {
  it("defaultOpen abre el modal con todos los items locales", async () => {
    setup({ items: provs(1, 3), defaultOpen: true });
    expect(await screen.findByRole("dialog", { name: "Seleccionar elemento" })).toBeInTheDocument();
    await waitFor(() => expect(bodyRows()).toHaveLength(3));
  });

  it("onOpenChange(false) al cerrar y open controlado respeta al padre", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness items={provs(1, 3)} open onOpenChange={onOpenChange} />);
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("dialog", { name: "Seleccionar elemento" })).toBeInTheDocument();
  });

  it("onOpenChange(true) cuando una búsqueda abre el modal", async () => {
    const onOpenChange = vi.fn();
    const { user } = setup({ items: provs(1, 3), onOpenChange });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("dialogTitle personaliza el título", async () => {
    const { user } = setup({ items: provs(1, 3), dialogTitle: "Elegir proveedor" });
    await user.click(trigger());
    expect(await screen.findByRole("dialog", { name: "Elegir proveedor" })).toBeInTheDocument();
  });
});

describe("EntityLookupField importación", () => {
  it("importar el índice del subpath no falla y expone el componente", async () => {
    const mod = await import("../index");
    expect(typeof mod.EntityLookupField).toBe("function");
  });
});
