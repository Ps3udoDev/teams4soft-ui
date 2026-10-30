import { describe, expect, it, vi } from "vitest";
import { createFeedbackDialogStore } from "./feedback-dialog-store";

describe("feedback dialog FIFO", () => {
  it("keeps stable snapshots and publishes only on mutations", async () => {
    const store = createFeedbackDialogStore();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    const empty = store.getState();
    expect(store.getState()).toBe(empty);
    const result = store.enqueue({ message: "first" });
    const active = store.getState();
    expect(active).not.toBe(empty);
    expect(store.getState()).toBe(active);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    store.resolveCurrent(true);
    expect(listener).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toBe(true);
  });

  it("settles every request in FIFO order without losing callbacks", async () => {
    const store = createFeedbackDialogStore();
    const first = store.enqueue({ message: "first" });
    const second = store.enqueue({ message: "second" });
    expect(store.getState()).toMatchObject({ current: { message: "first" }, pending: 1 });
    store.resolveCurrent(true);
    await expect(first).resolves.toBe(true);
    expect(store.getState()).toMatchObject({ current: { message: "second" }, pending: 0 });
    store.resolveCurrent(false);
    await expect(second).resolves.toBe(false);
    expect(store.getState().current).toBeNull();
  });

  it("ignores a stale completion instead of settling the next request", async () => {
    const store = createFeedbackDialogStore();
    const reused = { message: "reused" };
    const first = store.enqueue(reused);
    const request = store.getState().current!;
    const second = store.enqueue(reused);
    store.resolveCurrent(false, request);
    store.resolveCurrent(true, request);
    expect(store.getState().current).not.toBeNull();
    store.resolveCurrent(true);
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
  });

  it("settles visible and pending requests when a provider unmounts", async () => {
    const store = createFeedbackDialogStore();
    const first = store.enqueue({ message: "first" });
    const second = store.enqueue({ message: "second" });
    store.clear();
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    const empty = store.getState();
    store.clear();
    store.resolveCurrent(true);
    expect(store.getState()).toBe(empty);
  });
});
