import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("combina clases simples", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("ignora valores falsy", () => {
    expect(cn("px-2", false, null, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("resuelve conflictos de Tailwind dando prioridad a la última clase", () => {
    // la clase custom del consumidor (rounded-none) debe ganar
    expect(cn("rounded-md", "rounded-none")).toBe("rounded-none");
  });

  it("acepta arrays y objetos condicionales", () => {
    expect(cn(["px-2", { "py-1": true, hidden: false }])).toBe("px-2 py-1");
  });
});
