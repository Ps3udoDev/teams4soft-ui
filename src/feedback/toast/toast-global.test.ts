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
