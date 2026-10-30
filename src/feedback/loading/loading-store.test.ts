import { describe, expect, it, vi } from "vitest";
import { createLoadingStore } from "./loading-store";

describe("loading reference counter", () => {
  it("keeps the latest options until the final hide and never becomes negative", () => {
    const store = createLoadingStore();
    store.show({ message: "first" });
    store.show({ message: "second", indicator: "custom" });
    expect(store.getState()).toEqual({ count: 2, message: "second", indicator: "custom" });
    store.hide();
    expect(store.getState()).toEqual({ count: 1, message: "second", indicator: "custom" });
    store.hide();
    expect(store.getState()).toEqual({ count: 0 });
    const empty = store.getState();
    store.hide();
    expect(store.getState()).toBe(empty);
  });

  it("publishes stable snapshots, supports unsubscribe, and clears stale options", () => {
    const store = createLoadingStore();
    const initial = store.getState();
    expect(store.getState()).toBe(initial);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.show({ message: "old", indicator: "old" });
    store.show();
    expect(store.getState()).toEqual({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    store.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState()).toEqual({ count: 0 });
    expect(store.getServerState()).toBe(initial);
  });
});
