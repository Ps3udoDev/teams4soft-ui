import { describe, expect, it } from "vitest";
import { entityLookupMessagesEs } from "./lookup-core.types";
import { filterLocalItems, getByPath, isEmptyQuery, matchLocalItems, normalizeResponse } from "./lookup-utils";

describe("normalizeResponse", () => {
  it("treats null as abort", () => {
    expect(normalizeResponse(null)).toEqual({ kind: "abort" });
  });

  it("treats an array as client pagination", () => {
    expect(normalizeResponse([1, 2])).toEqual({ kind: "client", items: [1, 2] });
  });

  it("treats { items, total } as server pagination", () => {
    expect(normalizeResponse({ items: [1], total: 40 })).toEqual({ kind: "server", items: [1], total: 40, emptyMessage: undefined });
  });

  it("keeps emptyMessage on an empty server response", () => {
    const r = normalizeResponse({ items: [], total: 0, emptyMessage: "x" });
    expect(r).toMatchObject({ kind: "server", items: [], total: 0, emptyMessage: "x" });
  });
});

describe("isEmptyQuery", () => {
  it("detects blank strings", () => {
    expect(isEmptyQuery("")).toBe(true);
    expect(isEmptyQuery("   ")).toBe(true);
    expect(isEmptyQuery("a")).toBe(false);
  });

  it("detects records whose values are all blank", () => {
    expect(isEmptyQuery({ a: " ", b: "" })).toBe(true);
    expect(isEmptyQuery({ a: " ", b: "x" })).toBe(false);
  });
});

describe("getByPath", () => {
  it("resolves dotted paths", () => {
    expect(getByPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getByPath({ a: 1 }, "a")).toBe(1);
  });

  it("returns undefined for missing or null segments", () => {
    expect(getByPath({ a: null }, "a.b")).toBeUndefined();
    expect(getByPath(undefined, "a")).toBeUndefined();
    expect(getByPath({ a: 1 }, "x.y")).toBeUndefined();
  });
});

describe("filterLocalItems", () => {
  const items = [{ n: "Pérez", c: { id: "A1" } }, { n: "Gómez", c: { id: "B2" } }];

  it("contains, ignoring case and accents, over the given keys", () => {
    expect(filterLocalItems(items, "PEREZ", ["n"])).toEqual([items[0]]);
    expect(filterLocalItems(items, "b2", ["n", "c.id"])).toEqual([items[1]]);
    expect(filterLocalItems(items, "b2", ["n"])).toEqual([]);
  });
});

describe("matchLocalItems", () => {
  const items = [{ code: "PEREZ" }, { code: "PEREZ GARCIA" }];
  const label = (i: { code: string }) => i.code;

  it("prefers exact matches", () => {
    expect(matchLocalItems(items, "PEREZ", ["code"], label)).toEqual([items[0]]);
  });

  it("falls back to contains when there is no exact match", () => {
    expect(matchLocalItems(items, "PER", ["code"], label)).toEqual(items);
  });

  it("matches exactly on the label too", () => {
    const rows = [{ id: "1", name: "Ana" }, { id: "2", name: "Ana Maria" }];
    expect(matchLocalItems(rows, "ana", ["id"], (r) => r.name)).toEqual([rows[0]]);
  });

  it("uses matchItem when given", () => {
    expect(matchLocalItems(items, "zzz", ["code"], label, (i) => i.code.endsWith("GARCIA"))).toEqual([items[1]]);
  });
});

describe("entityLookupMessagesEs", () => {
  it("provides the Spanish defaults", () => {
    expect(entityLookupMessagesEs.trigger).toBe("Buscar");
    expect(entityLookupMessagesEs.notFound("x")).toBe("No se encontró «x»");
    expect(entityLookupMessagesEs.createPrompt("x")).toBe("«x» no fue encontrado. ¿Desea crear uno nuevo?");
    expect(entityLookupMessagesEs.queryRequired).toBe("Ingrese un término de búsqueda para continuar.");
  });
});
