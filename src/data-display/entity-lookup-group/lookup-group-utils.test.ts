import { afterEach, describe, expect, it, vi } from "vitest";
import type { LookupGroupField } from "./EntityLookupGroup.types";
import { applySelection, buildDefaultParams, buildDefaultSearchLabel, normalizeFields } from "./lookup-group-utils";

type Person = { paterno?: string; materno?: string; name?: string; alias?: string | null; id?: number };

const fields = normalizeFields<Person>([
  { key: "paterno", param: "apellidoPaterno", selectField: "paterno" },
  { key: "materno", param: "apellidoMaterno", selectField: "materno" },
  { key: "nombre", param: "nombre", selectField: "name" },
]);

describe("normalizeFields", () => {
  afterEach(() => vi.restoreAllMocks());

  it("defaults param to key and searchable to true", () => {
    const [field] = normalizeFields([{ key: "a" }]);
    expect(field).toMatchObject({ param: "a", searchable: true });
  });

  it("keeps explicit param and searchable false", () => {
    const [field] = normalizeFields([{ key: "a", param: "p", searchable: false }, { key: "b" }]);
    expect(field).toMatchObject({ param: "p", searchable: false });
  });

  it("makes the last field primary by default", () => {
    expect(fields.map((f) => f.primary)).toEqual([false, false, true]);
  });

  it("honors the marked primary", () => {
    const list = normalizeFields([{ key: "a", primary: true }, { key: "b" }]);
    expect(list.map((f) => f.primary)).toEqual([true, false]);
  });

  it("warns and keeps the first when several are primary", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const list = normalizeFields([{ key: "a" }, { key: "b", primary: true }, { key: "c", primary: true }]);
    expect(list.map((f) => f.primary)).toEqual([false, true, false]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("returns [] for no fields", () => {
    expect(normalizeFields([])).toEqual([]);
  });

  it("resolves primary to the last when none is searchable", () => {
    const list = normalizeFields([
      { key: "a", searchable: false },
      { key: "b", searchable: false },
    ]);
    expect(list.map((f) => f.primary)).toEqual([false, true]);
  });

  it("does not mutate the input", () => {
    const input: LookupGroupField[] = [{ key: "a" }];
    normalizeFields(input);
    expect(input[0]).toEqual({ key: "a" });
  });
});

describe("buildDefaultParams", () => {
  it("never sends one field's text in another's parameter", () => {
    const params = buildDefaultParams({
      fields,
      values: { paterno: "FUENTES", materno: "", nombre: "" },
      term: "FUENTES",
    });
    expect(params).toEqual({ apellidoPaterno: "FUENTES", apellidoMaterno: "", nombre: "", search: "FUENTES" });
    expect(params.nombre).toBe("");
  });

  it("keeps values apart after clearing one field and typing in another", () => {
    const params = buildDefaultParams({
      fields,
      values: { paterno: "", materno: "", nombre: "FELIPE" },
      term: "FELIPE",
    });
    expect(params.apellidoPaterno).toBe("");
    expect(params.apellidoMaterno).toBe("");
    expect(params.nombre).toBe("FELIPE");
  });

  it("trims values and tolerates missing keys", () => {
    const params = buildDefaultParams({ fields, values: { paterno: "  FUENTES  " }, term: " x " });
    expect(params).toMatchObject({ apellidoPaterno: "FUENTES", apellidoMaterno: "", nombre: "", search: "x" });
  });

  it("empties searchParam when every searchable field has a value", () => {
    const params = buildDefaultParams({
      fields,
      values: { paterno: "FUENTES", materno: "PEREZ", nombre: "FELIPE" },
      term: "FELIPE",
    });
    expect(params.search).toBe("");
    expect(params.nombre).toBe("FELIPE");
  });

  it("ignores non-searchable fields", () => {
    const list = normalizeFields([{ key: "a" }, { key: "code", searchable: false }]);
    const params = buildDefaultParams({ fields: list, values: { a: "x", code: "9" }, term: "x" });
    expect(params).toEqual({ a: "x", search: "" });
  });

  it("uses a custom searchParam and omits it when falsy", () => {
    const values = { paterno: "A" };
    expect(buildDefaultParams({ fields, values, term: "A", searchParam: "q" }).q).toBe("A");
    expect("search" in buildDefaultParams({ fields, values, term: "A", searchParam: "" })).toBe(false);
  });
});

describe("buildDefaultSearchLabel", () => {
  it("joins searchable fields with a value, in order", () => {
    expect(
      buildDefaultSearchLabel({ fields, values: { paterno: "FUENTES", materno: "PEREZ", nombre: "FELIPE" } }),
    ).toBe("FUENTES PEREZ FELIPE");
  });

  it("skips empty and non-searchable fields", () => {
    const list = normalizeFields([{ key: "a" }, { key: "b", searchable: false }, { key: "c" }]);
    expect(buildDefaultSearchLabel({ fields: list, values: { a: " X ", b: "Y", c: "" } })).toBe("X");
  });
});

describe("applySelection", () => {
  const row: Person = { paterno: "FUENTES", materno: "PEREZ", name: "FELIPE", id: 7 };

  it("fills each field from its selectField", () => {
    expect(applySelection(fields, { paterno: "F", materno: "", nombre: "" }, row)).toEqual({
      paterno: "FUENTES",
      materno: "PEREZ",
      nombre: "FELIPE",
    });
  });

  it("uses the first non-empty key of a list", () => {
    const list = normalizeFields<Person>([{ key: "n", selectField: ["alias", "name"] }]);
    expect(applySelection(list, {}, { alias: "", name: "FELIPE" })).toEqual({ n: "FELIPE" });
    expect(applySelection(list, {}, { alias: "FE", name: "FELIPE" })).toEqual({ n: "FE" });
    expect(applySelection(list, {}, { alias: null, name: "FELIPE" })).toEqual({ n: "FELIPE" });
  });

  it("stringifies numeric 0 as non-empty", () => {
    const list = normalizeFields<Person>([{ key: "n", selectField: "id" }]);
    expect(applySelection(list, {}, { id: 0 })).toEqual({ n: "0" });
  });

  it("clears a field whose keys are all empty (legacy behavior)", () => {
    expect(applySelection(fields, { paterno: "OLD", materno: "OLD", nombre: "OLD" }, { name: "FELIPE" })).toEqual({
      paterno: "",
      materno: "",
      nombre: "FELIPE",
    });
  });

  it("leaves fields without selectField untouched and does not mutate values", () => {
    const list = normalizeFields<Person>([{ key: "keep" }, { key: "n", selectField: "name" }]);
    const values = { keep: "K", n: "old" };
    const next = applySelection(list, values, row);
    expect(next).toEqual({ keep: "K", n: "FELIPE" });
    expect(values).toEqual({ keep: "K", n: "old" });
    expect(next).not.toBe(values);
  });

  it("reads dotted paths", () => {
    const list = normalizeFields([{ key: "n", selectField: "person.name" }]);
    expect(applySelection(list, {}, { person: { name: "ANA" } })).toEqual({ n: "ANA" });
  });
});
