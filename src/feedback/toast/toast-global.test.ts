import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toast,
  defaultToastStore,
  claimGlobalToastStore,
  releaseGlobalToastStore,
} from "./toast-global";

afterEach(() => {
  defaultToastStore.clear();
  // Libera cualquier reclamación que dejara una prueba.
  releaseGlobalToastStore();
  vi.restoreAllMocks();
});

describe("toast (objeto de módulo)", () => {
  it("escribe en la store por defecto", () => {
    claimGlobalToastStore();
    const id = toast.success({ title: "guardado" });
    const entry = defaultToastStore.getState().toasts[0]!;
    expect(entry.id).toBe(id);
    expect(entry.tone).toBe("success");
  });

  it("devuelve un id válido aunque no haya provider montado", () => {
    const id = toast.show({ title: "temprano" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(defaultToastStore.getState().toasts).toHaveLength(1);
  });

  it("avisa en desarrollo si no hay provider global montado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toast.show({ title: "sin provider" });
    expect(warn).toHaveBeenCalled();
  });

  it("no avisa cuando hay un provider global reclamado", () => {
    claimGlobalToastStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toast.show({ title: "con provider" });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("claim / release", () => {
  it("la primera reclamación gana y la segunda es rechazada con aviso", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(claimGlobalToastStore()).toBe(true);
    expect(claimGlobalToastStore()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("release vacía la store y permite volver a reclamar", () => {
    claimGlobalToastStore();
    toast.show({ title: "a" });
    releaseGlobalToastStore();
    expect(defaultToastStore.getState().toasts).toHaveLength(0);
    expect(claimGlobalToastStore()).toBe(true);
  });
});

describe("persistencia entre copias del módulo (simula el bundling duplicado)", () => {
  // `tsup` inlina este archivo por separado en cada entrada del build
  // (index/feedback × esm/cjs), así que en producción existen hasta cuatro
  // copias del módulo. Esta prueba simula esa situación reimportando el
  // módulo tras `vi.resetModules()` y comprobando que la "segunda copia" ve
  // el estado escrito por la primera, porque ambas comparten el slot de
  // `globalThis` en lugar de tener cada una su propia variable de módulo.
  it("una reimportación del módulo observa el estado escrito por la primera copia", async () => {
    claimGlobalToastStore();
    toast.show({ title: "desde la primera copia", duration: "persistent" });
    expect(defaultToastStore.getState().toasts).toHaveLength(1);

    vi.resetModules();
    const reimported = await import("./toast-global");

    // Misma store: ve la entrada escrita a través de la primera copia.
    expect(reimported.defaultToastStore.getState().toasts).toHaveLength(1);
    expect(reimported.defaultToastStore.getState().toasts[0]!.title).toBe(
      "desde la primera copia",
    );

    // Mismo flag `claimed`: la copia reimportada no puede reclamar de nuevo.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(reimported.claimGlobalToastStore()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();

    reimported.releaseGlobalToastStore();
  });
});
