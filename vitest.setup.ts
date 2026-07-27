import "@testing-library/jest-dom/vitest";

// jsdom no implementa ResizeObserver. Radix usa `@radix-ui/react-use-size`
// (vía Popper/Tooltip) para medir el trigger; sin este stub, montar
// cualquier primitiva basada en Popper lanza un ReferenceError.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
