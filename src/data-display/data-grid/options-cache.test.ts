import { describe, expect, it, vi } from "vitest";
import { createOptionsCache } from "./options-cache";

describe("createOptionsCache", () => {
  it("llama al loader una vez para 20 llamadas iguales y comparte el array", async () => {
    const cache = createOptionsCache();
    const fn = vi.fn(async () => [{ v: 1 }]);
    const results = await Promise.all(
      Array.from({ length: 20 }, () => cache.load("branch", "", fn)),
    );
    expect(fn).toHaveBeenCalledTimes(1);
    for (const r of results) expect(r).toBe(results[0]);
  });

  it("comparte la entrada entre 'a' y 'a ' y pasa la consulta recortada", async () => {
    const cache = createOptionsCache();
    const fn = vi.fn(async (q: string) => [q]);
    await cache.load("f", "a", fn);
    await cache.load("f", "a ", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
    await cache.load("f", "  b  ", fn);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("no comparte entre campos distintos", async () => {
    const cache = createOptionsCache();
    const fn = vi.fn(async () => []);
    await cache.load("a", "", fn);
    await cache.load("b", "", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("un rechazo se elimina y la siguiente llamada reintenta", async () => {
    const cache = createOptionsCache();
    const fn = vi
      .fn<(q: string) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValueOnce(["ok"]);
    const [p1, p2] = [cache.load("f", "", fn), cache.load("f", "", fn)];
    await expect(p1).rejects.toThrow("x");
    await expect(p2).rejects.toThrow("x");
    expect(fn).toHaveBeenCalledTimes(1);
    await expect(cache.load("f", "", fn)).resolves.toEqual(["ok"]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("un loader que lanza de forma síncrona se comporta como rechazo", async () => {
    const cache = createOptionsCache();
    const bad = vi.fn((): Promise<string[]> => {
      throw new Error("sync");
    });
    await expect(cache.load("f", "", bad)).rejects.toThrow("sync");
    const good = vi.fn(async () => ["ok"]);
    await expect(cache.load("f", "", good)).resolves.toEqual(["ok"]);
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("clear(field) fuerza recarga solo de esa columna; clear() limpia todo", async () => {
    const cache = createOptionsCache();
    const a = vi.fn(async () => ["a"]);
    const b = vi.fn(async () => ["b"]);
    await cache.load("a", "", a);
    await cache.load("b", "", b);
    cache.clear("a");
    await cache.load("a", "", a);
    await cache.load("b", "", b);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
    cache.clear();
    await cache.load("b", "", b);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("el rechazo viejo no borra una entrada nueva tras clear()", async () => {
    const cache = createOptionsCache();
    let rejectOld!: (e: Error) => void;
    const old = cache.load(
      "f",
      "",
      () => new Promise<string[]>((_, rej) => (rejectOld = rej)),
    );
    cache.clear("f");
    const fresh = vi.fn(async () => ["new"]);
    await cache.load("f", "", fresh);
    rejectOld(new Error("late"));
    await expect(old).rejects.toThrow("late");
    await cache.load("f", "", fresh);
    expect(fresh).toHaveBeenCalledTimes(1);
  });

  it("no genera rechazos no manejados por su contabilidad interna", async () => {
    const seen: unknown[] = [];
    const onUnhandled = (e: unknown) => seen.push(e);
    process.on("unhandledRejection", onUnhandled);
    const cache = createOptionsCache();
    await expect(
      cache.load("f", "", () => Promise.reject(new Error("x"))),
    ).rejects.toThrow("x");
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", onUnhandled);
    expect(seen).toEqual([]);
  });
});
