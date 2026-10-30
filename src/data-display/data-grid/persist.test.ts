import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPersistStorageKey, readPersistedVisibility, writePersistedVisibility } from "./persist";

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("persistencia de columnas", () => {
  it("genera una huella estable sensible a los campos y su orden", () => {
    const key = buildPersistStorageKey("premiums", ["id", "policy"]);
    expect(key).toBe(buildPersistStorageKey("premiums", ["id", "policy"]));
    expect(key).toMatch(/^t4s-ui:data-grid:premiums:[a-z0-9]+$/);
    expect(key).not.toBe(buildPersistStorageKey("premiums", ["policy", "id"]));
    expect(key).not.toBe(buildPersistStorageKey("premiums", ["id", "policy", "amount"]));
  });
  it("lee y escribe un mapa de booleanos", () => {
    writePersistedVisibility("grid", { id: true, amount: false });
    expect(readPersistedVisibility("grid")).toEqual({ id: true, amount: false });
  });
  it.each(["{no-json", "null", "[]", "42", '"abc"', '{"policy":"false"}'])("ignora contenido inválido: %s", (json) => {
    localStorage.setItem("grid", json);
    expect(readPersistedVisibility("grid")).toBeNull();
  });
  it("tolera errores al leer y escribir", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    expect(readPersistedVisibility("grid")).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => writePersistedVisibility("grid", {})).not.toThrow();
  });
});
