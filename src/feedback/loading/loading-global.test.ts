import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimGlobalLoadingStore, defaultLoadingStore, loading, releaseGlobalLoadingStore,
} from "./loading-global";

afterEach(() => { releaseGlobalLoadingStore(); vi.restoreAllMocks(); });

describe("loading imperative API", () => {
  it("warns once for a show without provider and retains pending loading", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    loading.show("waiting");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(defaultLoadingStore.getState()).toMatchObject({ count: 1, message: "waiting" });
  });

  it("accepts a React node or an options object", () => {
    claimGlobalLoadingStore();
    const element = React.createElement("span", null, "message");
    loading.show(element);
    expect(defaultLoadingStore.getState().message).toBe(element);
    loading.show({ message: "report", indicator: element });
    expect(defaultLoadingStore.getState()).toEqual({ count: 2, message: "report", indicator: element });
  });

  it("wrap preserves fulfillment and rejection and hides in either case", async () => {
    claimGlobalLoadingStore();
    await expect(loading.wrap(Promise.resolve(42), "success")).resolves.toBe(42);
    expect(defaultLoadingStore.getState().count).toBe(0);
    const failure = new Error("failure");
    await expect(loading.wrap(Promise.reject(failure), "failure")).rejects.toBe(failure);
    expect(defaultLoadingStore.getState().count).toBe(0);
  });

  it.each([42, React.createElement("strong", null, "working")])("wrap preserves a ReactNode message: %s", async (message) => {
    claimGlobalLoadingStore();
    let finish!: (value: string) => void;
    const result = loading.wrap(new Promise<string>((resolve) => { finish = resolve; }), message);
    expect(defaultLoadingStore.getState().message).toBe(message);
    expect(defaultLoadingStore.getState().count).toBe(1);
    finish("done");
    await expect(result).resolves.toBe("done");
    expect(defaultLoadingStore.getState().count).toBe(0);
  });

  it("a wrap from an unmounted owner cannot hide the next owner's loading", async () => {
    claimGlobalLoadingStore();
    let finish!: () => void;
    const old = loading.wrap(new Promise<void>((resolve) => { finish = resolve; }));
    releaseGlobalLoadingStore();
    claimGlobalLoadingStore();
    loading.show("new session");
    finish();
    await old;
    expect(defaultLoadingStore.getState()).toMatchObject({ count: 1, message: "new session" });
  });

  it("shares the global slot across independently loaded entry points", async () => {
    claimGlobalLoadingStore();
    loading.show("shared");
    vi.resetModules();
    const copy = await import("./loading-global");
    expect(copy.defaultLoadingStore).toBe(defaultLoadingStore);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(copy.claimGlobalLoadingStore()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    copy.loading.hide();
    expect(defaultLoadingStore.getState().count).toBe(0);
  });
});
