import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimGlobalFeedbackDialogStore, confirm, defaultFeedbackDialogStore,
  notify, releaseGlobalFeedbackDialogStore,
} from "./feedback-dialog-global";

afterEach(() => {
  releaseGlobalFeedbackDialogStore();
  vi.restoreAllMocks();
});

describe("imperative feedback", () => {
  it("throws synchronously with the exact explanation without a global provider", () => {
    const message = "[teams4soft-ui] confirm()/notify() requieren <FeedbackDialogProvider global /> montado en la raíz de la app.";
    expect(() => confirm({ message: "x" })).toThrow(message);
    expect(() => notify({ message: "x" })).toThrow(message);
    expect(() => notify.error("x")).toThrow(message);
    expect(defaultFeedbackDialogStore.getState().current).toBeNull();
  });

  it("maps notice shortcuts and resolves only after dismissal", async () => {
    claimGlobalFeedbackDialogStore();
    const done = vi.fn();
    const result = notify.error("x", { title: "Error" }).then(done);
    expect(defaultFeedbackDialogStore.getState().current).toMatchObject({
      variant: "notice", severity: "danger", message: "x", title: "Error", showReject: false,
    });
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    defaultFeedbackDialogStore.resolveCurrent(false);
    await result;
    expect(done).toHaveBeenCalledWith(undefined);
  });

  it("uses the same global slot across separately loaded entry points", async () => {
    claimGlobalFeedbackDialogStore();
    const pending = confirm({ message: "shared" });
    vi.resetModules();
    const copy = await import("./feedback-dialog-global");
    expect(copy.defaultFeedbackDialogStore).toBe(defaultFeedbackDialogStore);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(copy.claimGlobalFeedbackDialogStore()).toBe(false);
    expect(warn).toHaveBeenCalled();
    copy.defaultFeedbackDialogStore.resolveCurrent(true);
    await expect(pending).resolves.toBe(true);
  });

  it("releasing ownership settles requests and allows another claim", async () => {
    expect(claimGlobalFeedbackDialogStore()).toBe(true);
    const request = confirm({ message: "abandoned" });
    releaseGlobalFeedbackDialogStore();
    await expect(request).resolves.toBe(false);
    expect(claimGlobalFeedbackDialogStore()).toBe(true);
  });
});
