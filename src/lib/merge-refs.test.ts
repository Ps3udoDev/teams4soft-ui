import { describe, it, expect, vi } from "vitest";
import { mergeRefs } from "./merge-refs";

describe("mergeRefs", () => {
  it("asigna el nodo a una ref de callback y a una ref de objeto", () => {
    const callbackRef = vi.fn();
    const objectRef = { current: null as string | null };
    const merged = mergeRefs<string>(callbackRef, objectRef);
    merged("node");
    expect(callbackRef).toHaveBeenCalledWith("node");
    expect(objectRef.current).toBe("node");
  });

  it("ignora refs undefined o null", () => {
    const objectRef = { current: null as string | null };
    const merged = mergeRefs<string>(undefined, null, objectRef);
    merged("node");
    expect(objectRef.current).toBe("node");
  });
});
