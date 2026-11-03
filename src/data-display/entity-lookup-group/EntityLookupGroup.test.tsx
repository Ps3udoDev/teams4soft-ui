import * as React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityLookupGroup } from "./EntityLookupGroup";
import type { EntityLookupGroupProps, LookupGroupField } from "./EntityLookupGroup.types";
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

type Person = { id: number; lastName1: string; lastName2: string; name: string };
const person = (n: number): Person => ({ id: n, lastName1: `PATERNO${n}`, lastName2: `MATERNO${n}`, name: `NOMBRE${n}` });
const people = (from: number, count: number) => Array.from({ length: count }, (_, i) => person(from + i));
const columns: DataGridColumn<Person>[] = [
  { field: "lastName1", header: "Paterno" },
  { field: "lastName2", header: "Materno" },
  { field: "name", header: "Nombre" },
];

const fields: LookupGroupField[] = [
  { key: "paterno", param: "lastName1", label: "Apellido paterno", selectField: "lastName1" },
  { key: "materno", param: "lastName2", label: "Apellido materno", selectField: "lastName2" },
  { key: "nombre", param: "name", label: "Nombre", selectField: "name" },
];

const empty = { paterno: "", materno: "", nombre: "" };
const full = { paterno: "FUENTES", materno: "PEREZ", nombre: "FELIPE" };

type Over = Partial<EntityLookupGroupProps<Person>> & { initial?: Record<string, string> };

function Harness({ initial = empty, onValuesChange, ...rest }: Over) {
  const [values, setValues] = React.useState(initial);
  return (
    <EntityLookupGroup<Person>
      fields={fields}
      values={values}
      onValuesChange={(...args) => { setValues(args[0]); onValuesChange?.(...args); }}
      getItemId={(p) => p.id}
      columns={columns}
      search={async () => []}
      {...rest}
    />
  );
}

function setup(over: Over = {}) {
  const onValuesChange = vi.fn();
  const onSelectionChange = vi.fn();
  const view = render(<Harness onValuesChange={onValuesChange} onSelectionChange={onSelectionChange} {...over} />);
  return { onValuesChange, onSelectionChange, user: userEvent.setup(), view };
}

const field = (label: string) => screen.getByRole("textbox", { name: new RegExp(`^${label}`) }) as HTMLInputElement;
const trigger = () => screen.getByRole("button", { name: "Buscar" });
const dialog = () => screen.getByRole("dialog", { name: "Seleccionar elemento" });
const bodyRows = () => within(within(dialog()).getAllByRole("rowgroup")[1]!).getAllByRole("row");
const accept = () => within(dialog()).getByRole("button", { name: "Aceptar" });

function remote(response: (params: Record<string, string>, page: number) => LookupSearchResponse<Person>) {
  return vi.fn(async (params: Record<string, string>, ctx: { page: number }) => response(params, ctx.page));
}

describe("EntityLookupGroup búsqueda", () => {
  it("Enter en Nombre con los tres campos llenos manda cada texto en su parámetro y search vacío", async () => {
    const search = remote(() => people(1, 3));
    const { user } = setup({ search, initial: full });
    await user.type(field("Nombre"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      { lastName1: "FUENTES", lastName2: "PEREZ", name: "FELIPE", search: "" },
      expect.objectContaining({ page: 1, pageSize: 50 }),
    );
  });

  it("usa los valores del momento de buscar: escribir en uno, vaciarlo y escribir en otro no deja texto viejo", async () => {
    const search = remote(() => []);
    const { user } = setup({ search });
    await user.type(field("Apellido paterno"), "FUE");
    await user.clear(field("Apellido paterno"));
    await user.type(field("Nombre"), "FEL{Enter}");
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]![0]).toEqual({ lastName1: "", lastName2: "", name: "FEL", search: "FEL" });
  });

  it("el parámetro de un campo nunca lleva el texto de otro", async () => {
    const search = remote(() => []);
    const { user } = setup({ search });
    await user.type(field("Apellido paterno"), "FUENTES{Enter}");
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]![0]).toEqual({ lastName1: "FUENTES", lastName2: "", name: "", search: "FUENTES" });
  });

  it("Enter en un buscable con su texto vacío no busca aunque otros tengan texto", async () => {
    const search = remote(() => people(1, 3));
    const { user } = setup({ search, initial: { ...empty, nombre: "FELIPE" } });
    field("Apellido paterno").focus();
    await user.keyboard("{Enter}");
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Enter en un campo no buscable no busca", async () => {
    const search = remote(() => people(1, 3));
    const list: LookupGroupField[] = [{ key: "code", label: "Código", searchable: false }, { key: "nombre", label: "Nombre" }];
    const { user } = setup({ search, fields: list, initial: { code: "9", nombre: "" } });
    await user.type(field("Código"), "{Enter}");
    expect(search).not.toHaveBeenCalled();
  });

  it("Enter nunca envía el formulario que contiene el grupo", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(<form onSubmit={onSubmit}><Harness search={remote(() => null)} initial={full} /></form>);
    await user.type(field("Nombre"), "{Enter}");
    await user.type(field("Apellido paterno"), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Tab no busca", async () => {
    const search = remote(() => people(1, 3));
    const { user } = setup({ search, initial: full });
    field("Apellido paterno").focus();
    await user.tab();
    expect(search).not.toHaveBeenCalled();
  });

  it("escribir llama onValuesChange(next, changedKey)", async () => {
    const { user, onValuesChange } = setup();
    await user.type(field("Apellido materno"), "P");
    expect(onValuesChange).toHaveBeenLastCalledWith({ ...empty, materno: "P" }, "materno");
  });
});

describe("EntityLookupGroup selección", () => {
  it("un resultado llena los campos sin abrir el modal: una llamada a onValuesChange sin changedKey y luego onSelectionChange", async () => {
    const search = remote(() => [person(7)]);
    const { user, onValuesChange, onSelectionChange } = setup({ search, initial: { ...empty, nombre: "NOM" } });
    onValuesChange.mockClear();
    await user.type(field("Nombre"), "{Enter}");
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(person(7)));
    expect(onValuesChange).toHaveBeenCalledTimes(1);
    expect(onValuesChange.mock.calls[0]).toEqual([{ paterno: "PATERNO7", materno: "MATERNO7", nombre: "NOMBRE7" }]);
    expect(onValuesChange.mock.invocationCallOrder[0]!).toBeLessThan(onSelectionChange.mock.invocationCallOrder[0]!);
    expect(field("Apellido paterno")).toHaveValue("PATERNO7");
    expect(field("Nombre")).toHaveValue("NOMBRE7");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("varios resultados abren el modal y Aceptar produce una sola llamada a onValuesChange con los tres campos", async () => {
    const search = remote(() => people(1, 3));
    const { user, onValuesChange, onSelectionChange } = setup({ search, initial: full });
    onValuesChange.mockClear();
    await user.type(field("Nombre"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(bodyRows()).toHaveLength(3);
    expect(accept()).toBeDisabled();
    await user.click(within(bodyRows()[1]!).getByText("PATERNO2"));
    await user.click(accept());
    expect(onValuesChange).toHaveBeenCalledTimes(1);
    expect(onValuesChange).toHaveBeenCalledWith({ paterno: "PATERNO2", materno: "MATERNO2", nombre: "NOMBRE2" });
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(person(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(field("Apellido materno")).toHaveValue("MATERNO2");
  });

  it("cero resultados avisa con los campos buscables unidos y aceptar no borra lo capturado", async () => {
    const { user, onValuesChange, onSelectionChange } = setup({ search: remote(() => []), initial: full });
    onValuesChange.mockClear();
    await user.type(field("Nombre"), "{Enter}");
    expect(await screen.findByText("No se encontró «FUENTES PEREZ FELIPE»")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(screen.queryByText(/No se encontró/)).toBeNull());
    expect(field("Apellido paterno")).toHaveValue("FUENTES");
    expect(field("Apellido materno")).toHaveValue("PEREZ");
    expect(field("Nombre")).toHaveValue("FELIPE");
    expect(onValuesChange).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("getSearchLabel reemplaza el texto del aviso", async () => {
    const getSearchLabel = vi.fn(() => "ETIQUETA");
    const { user } = setup({ search: remote(() => []), initial: full, getSearchLabel });
    await user.type(field("Nombre"), "{Enter}");
    expect(await screen.findByText("No se encontró «ETIQUETA»")).toBeInTheDocument();
  });

  it("cero resultados con onCreateRequest ofrece crear con la etiqueta de la búsqueda", async () => {
    const onCreateRequest = vi.fn();
    const { user } = setup({ search: remote(() => []), initial: full, onCreateRequest });
    await user.type(field("Nombre"), "{Enter}");
    await user.click(await screen.findByRole("button", { name: "Sí, crear nuevo" }));
    await waitFor(() => expect(onCreateRequest).toHaveBeenCalledWith("FUENTES PEREZ FELIPE"));
  });

  it("buildParams reemplaza los parámetros por completo", async () => {
    const search = remote(() => []);
    const buildParams = vi.fn(() => ({ q: "custom" }));
    const { user } = setup({ search, initial: full, buildParams });
    await user.type(field("Nombre"), "{Enter}");
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]![0]).toEqual({ q: "custom" });
    expect(buildParams).toHaveBeenCalledWith(expect.objectContaining({ values: full, term: "FELIPE", searchParam: "search" }));
  });
});

describe("EntityLookupGroup botón", () => {
  it("solo el campo primary lleva el botón; por defecto es el último", () => {
    setup();
    expect(screen.getAllByRole("button", { name: "Buscar" })).toHaveLength(1);
    expect(within(field("Nombre").closest("[data-slot=field]") as HTMLElement).getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("primary explícito mueve el botón", () => {
    const list = fields.map((f) => (f.key === "paterno" ? { ...f, primary: true } : f));
    setup({ fields: list });
    expect(screen.getAllByRole("button", { name: "Buscar" })).toHaveLength(1);
    expect(within(field("Apellido paterno").closest("[data-slot=field]") as HTMLElement).getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("con todo vacío pide la primera página con todos los parámetros vacíos", async () => {
    const search = remote(() => people(1, 3));
    const { user } = setup({ search });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(search).toHaveBeenCalledWith(
      { lastName1: "", lastName2: "", name: "", search: "" },
      expect.objectContaining({ page: 1 }),
    );
  });

  it("con todo vacío y respuesta vacía muestra queryRequired", async () => {
    const { user } = setup({ search: remote(() => []) });
    await user.click(trigger());
    expect(await screen.findByText("Ingrese un término de búsqueda para continuar.")).toBeInTheDocument();
    expect(screen.queryByText(/No se encontró/)).toBeNull();
  });

  it("con todo vacío y un solo resultado abre el modal en lugar de elegirlo", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => [person(1)]) });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("con captura busca con el primer campo buscable con texto como término", async () => {
    const search = remote(() => []);
    const { user } = setup({ search, initial: { ...empty, materno: "PEREZ", nombre: "FEL" } });
    await user.click(trigger());
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]![0]).toEqual({ lastName1: "", lastName2: "PEREZ", name: "FEL", search: "PEREZ" });
    expect(await screen.findByText("No se encontró «PEREZ FEL»")).toBeInTheDocument();
  });

  it("con captura y un resultado selecciona sin modal", async () => {
    const { user, onSelectionChange } = setup({ search: remote(() => [person(4)]), initial: full });
    await user.click(trigger());
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(person(4)));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("el botón queda ocupado mientras busca", async () => {
    let release: (rows: Person[]) => void = () => {};
    const search = vi.fn(() => new Promise<Person[]>((resolve) => { release = resolve; }));
    const { user } = setup({ search, initial: full });
    await user.click(trigger());
    await waitFor(() => expect(trigger()).toHaveAttribute("aria-busy", "true"));
    release([person(1)]);
    await waitFor(() => expect(trigger()).not.toHaveAttribute("aria-busy"));
  });

  it("deshabilitado no busca", async () => {
    const search = remote(() => []);
    const { user } = setup({ search, fields: fields.map((f) => ({ ...f, disabled: true })) });
    expect(trigger()).toBeDisabled();
    await user.click(trigger());
    expect(search).not.toHaveBeenCalled();
  });
});

describe("EntityLookupGroup modal", () => {
  it("paginación del servidor: la página 2 conserva los parámetros y no repite la búsqueda al abrir", async () => {
    const search = remote((_p, page) => ({ items: people((page - 1) * 10 + 1, 10), total: 25 }));
    const { user } = setup({ search, pageSize: 10, initial: full });
    await user.type(field("Nombre"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    expect(search).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(search).toHaveBeenLastCalledWith(
      { lastName1: "FUENTES", lastName2: "PEREZ", name: "FELIPE", search: "" },
      expect.objectContaining({ page: 2, pageSize: 10 }),
    );
    await waitFor(() => expect(within(bodyRows()[0]!).getByText("PATERNO11")).toBeInTheDocument());
  });

  it("cambiar de página no cierra el modal ni pierde las filas", async () => {
    let release: (value: LookupSearchResponse<Person>) => void = () => {};
    const search = vi.fn(async (_p: Record<string, string>, ctx: { page: number }) => {
      if (ctx.page === 1) return { items: people(1, 10), total: 25 };
      return new Promise<LookupSearchResponse<Person>>((resolve) => { release = resolve; });
    });
    const { user } = setup({ search, pageSize: 10, initial: full });
    await user.type(field("Nombre"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(dialog()).toBeInTheDocument();
    expect(bodyRows().length).toBeGreaterThan(0);
    release({ items: people(11, 10), total: 25 });
    await waitFor(() => expect(within(bodyRows()[0]!).getByText("PATERNO11")).toBeInTheDocument());
  });

  it("al cerrar con Escape el foco vuelve al campo que inició la búsqueda", async () => {
    const { user } = setup({ search: remote(() => people(1, 3)), initial: full });
    await user.type(field("Apellido materno"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(field("Apellido materno"));
  });

  it("al cerrar tras el botón el foco vuelve al input del primary", async () => {
    const { user } = setup({ search: remote(() => people(1, 3)), initial: full });
    await user.click(trigger());
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.click(within(bodyRows()[0]!).getByText("PATERNO1"));
    await user.click(accept());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(field("Nombre"));
  });

  it("con onCreateRequest el pie ofrece Nuevo y lo llama con la etiqueta de la búsqueda", async () => {
    const onCreateRequest = vi.fn();
    const { user } = setup({ search: remote(() => people(1, 3)), initial: full, onCreateRequest });
    await user.type(field("Nombre"), "{Enter}");
    await screen.findByRole("dialog", { name: "Seleccionar elemento" });
    await user.click(within(dialog()).getByRole("button", { name: "Nuevo" }));
    expect(onCreateRequest).toHaveBeenCalledWith("FUENTES PEREZ FELIPE");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("título del modal se respeta", async () => {
    const { user } = setup({ search: remote(() => people(1, 3)), initial: full, dialogTitle: "Buscar persona" });
    await user.type(field("Nombre"), "{Enter}");
    expect(await screen.findByRole("dialog", { name: "Buscar persona" })).toBeInTheDocument();
  });

  it("una búsqueda que lanza llama onSearchError y conserva lo capturado", async () => {
    const error = new Error("boom");
    const onSearchError = vi.fn();
    const { user } = setup({ search: vi.fn(async () => { throw error; }), onSearchError, initial: full });
    await user.type(field("Nombre"), "{Enter}");
    await waitFor(() => expect(onSearchError).toHaveBeenCalledWith(error));
    expect(field("Nombre")).toHaveValue("FELIPE");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("EntityLookupGroup layout y campos", () => {
  it("grid de gridColumns columnas en md+ y una en móvil", () => {
    const { view } = setup({ gridColumns: 3 });
    const grid = view.container.querySelector("[data-slot=grid]") as HTMLElement;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("md:grid-cols-3");
  });

  it("gridColumns por defecto es 2", () => {
    const { view } = setup();
    expect((view.container.querySelector("[data-slot=grid]") as HTMLElement).className).toContain("md:grid-cols-2");
  });

  it("col, row y colSpan usan clases enumeradas en md+", () => {
    const list: LookupGroupField[] = [{ key: "a", label: "A", col: 2, row: 3, colSpan: 2 }, { key: "b", label: "B" }];
    const { view } = setup({ fields: list, initial: { a: "", b: "" } });
    const item = view.container.querySelector("[data-slot=field]") as HTMLElement;
    expect(item.className).toContain("md:col-start-2");
    expect(item.className).toContain("md:row-start-3");
    expect(item.className).toContain("md:col-span-2");
  });

  it("cada campo muestra label, placeholder, description, error, required, disabled, type y clearable", async () => {
    const list: LookupGroupField[] = [
      { key: "a", label: "Alfa", placeholder: "escribe", description: "ayuda", required: true, type: "email", clearable: true },
      { key: "b", label: "Beta", disabled: true, errorMessage: "malo" },
    ];
    const { user } = setup({ fields: list, initial: { a: "x", b: "" } });
    const alpha = field("Alfa");
    expect(alpha).toHaveAttribute("placeholder", "escribe");
    expect(alpha).toHaveAttribute("type", "email");
    expect(alpha).toBeRequired();
    expect(screen.getByText("ayuda")).toBeInTheDocument();
    expect(screen.getByText("malo")).toBeInTheDocument();
    expect(field("Beta")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(alpha).toHaveValue("");
  });

  it("el contrato universal: className, data-*, classNames de slots", () => {
    const { view } = setup({
      className: "mi-grupo",
      "data-testid": "grupo",
      classNames: { grid: "mi-grid", field: "mi-campo", trigger: "mi-boton" },
    });
    const root = view.container.querySelector("[data-slot=root]") as HTMLElement;
    expect(root).toHaveClass("mi-grupo");
    expect(root).toHaveAttribute("data-testid", "grupo");
    expect(view.container.querySelector("[data-slot=grid]")).toHaveClass("mi-grid");
    expect(view.container.querySelector("[data-slot=field]")).toHaveClass("mi-campo");
    expect(trigger()).toHaveClass("mi-boton");
  });
});
