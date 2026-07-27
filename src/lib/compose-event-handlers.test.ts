import { describe, it, expect, vi } from "vitest";
import { composeEventHandlers } from "./compose-event-handlers";

type FakeEvent = { defaultPrevented: boolean };

describe("composeEventHandlers", () => {
  it("llama primero al handler externo y luego al interno", () => {
    const order: string[] = [];
    const theirs = () => order.push("theirs");
    const ours = () => order.push("ours");
    const handler = composeEventHandlers<FakeEvent>(theirs, ours);
    handler({ defaultPrevented: false });
    expect(order).toEqual(["theirs", "ours"]);
  });

  it("no llama al interno si el externo previno el default", () => {
    const ours = vi.fn();
    const theirs = (e: FakeEvent) => {
      e.defaultPrevented = true;
    };
    const handler = composeEventHandlers<FakeEvent>(theirs, ours);
    handler({ defaultPrevented: false });
    expect(ours).not.toHaveBeenCalled();
  });

  it("sí llama al interno si checkForDefaultPrevented es false", () => {
    const ours = vi.fn();
    const theirs = (e: FakeEvent) => {
      e.defaultPrevented = true;
    };
    const handler = composeEventHandlers<FakeEvent>(theirs, ours, {
      checkForDefaultPrevented: false,
    });
    handler({ defaultPrevented: false });
    expect(ours).toHaveBeenCalledOnce();
  });

  it("funciona sin handler externo", () => {
    const ours = vi.fn();
    const handler = composeEventHandlers<FakeEvent>(undefined, ours);
    handler({ defaultPrevented: false });
    expect(ours).toHaveBeenCalledOnce();
  });
});
