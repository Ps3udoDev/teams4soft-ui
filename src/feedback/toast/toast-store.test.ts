import { describe, it, expect, vi } from "vitest";
import { createToastStore, resolveToastDuration } from "./toast-store";

describe("resolveToastDuration", () => {
  it("usa el fallback cuando no se indica duración", () => {
    expect(resolveToastDuration(undefined, 4000)).toBe(4000);
  });

  it("respeta una duración explícita", () => {
    expect(resolveToastDuration(1500, 4000)).toBe(1500);
  });

  it('traduce "persistent" a un entero finito, nunca Infinity', () => {
    const resolved = resolveToastDuration("persistent", 4000);
    expect(Number.isFinite(resolved)).toBe(true);
    expect(resolved).toBeGreaterThan(60_000);
    // `setTimeout` coacciona su argumento a int32: Infinity colapsaría a 0 y
    // el toast "persistente" se cerraría de inmediato.
    expect(resolved).toBeLessThanOrEqual(2_147_483_647);
  });
});

describe("createToastStore — cola", () => {
  it("conserva el orden FIFO", () => {
    const store = createToastStore();
    store.show({ title: "uno" });
    store.show({ title: "dos" });
    store.show({ title: "tres" });
    expect(store.getState().toasts.map((t) => t.title)).toEqual([
      "uno",
      "dos",
      "tres",
    ]);
  });

  it("devuelve ids únicos", () => {
    const store = createToastStore();
    const ids = [store.show({ title: "a" }), store.show({ title: "b" })];
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  it("respeta el id proporcionado", () => {
    const store = createToastStore();
    expect(store.show({ id: "custom", title: "a" })).toBe("custom");
  });

  it("aplica los valores por defecto de tone y dismissible", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    const entry = store.getState().toasts[0]!;
    expect(entry.tone).toBe("neutral");
    expect(entry.dismissible).toBe(true);
    expect(entry.status).toBe("open");
  });

  it("descarta la entrada más antigua al superar maxQueued", () => {
    const store = createToastStore({ maxQueued: 2 });
    store.show({ title: "uno" });
    store.show({ title: "dos" });
    store.show({ title: "tres" });
    expect(store.getState().toasts.map((t) => t.title)).toEqual([
      "dos",
      "tres",
    ]);
  });
});

describe("createToastStore — snapshot estable", () => {
  it("devuelve la misma referencia mientras no haya mutaciones", () => {
    const store = createToastStore();
    expect(store.getState()).toBe(store.getState());
    store.show({ title: "a" });
    const afterShow = store.getState();
    expect(afterShow).toBe(store.getState());
  });

  it("cambia de referencia tras cada mutación", () => {
    const store = createToastStore();
    const before = store.getState();
    store.show({ title: "a" });
    expect(store.getState()).not.toBe(before);
  });

  it("notifica a los suscriptores y permite darse de baja", () => {
    const store = createToastStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.show({ title: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.show({ title: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("createToastStore — atajos por tono", () => {
  it("success/error/warning/info fijan el tono", () => {
    const store = createToastStore();
    store.success({ title: "s" });
    store.error({ title: "e" });
    store.warning({ title: "w" });
    store.info({ title: "i" });
    expect(store.getState().toasts.map((t) => t.tone)).toEqual([
      "success",
      "error",
      "warning",
      "info",
    ]);
  });
});

describe("createToastStore — deduplicación", () => {
  it("refresca el existente en vez de duplicar y devuelve su id", () => {
    const store = createToastStore();
    const first = store.show({ title: "sin red", dedupeKey: "offline" });
    const second = store.show({ title: "sin red (2)", dedupeKey: "offline" });

    expect(second).toBe(first);
    expect(store.getState().toasts).toHaveLength(1);
    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("sin red (2)");
    expect(entry.restartedAt).toBe(1);
  });

  it("no deduplica contra un toast que ya se está cerrando", () => {
    const store = createToastStore();
    const first = store.show({ title: "a", dedupeKey: "k" });
    store.dismiss(first);
    const second = store.show({ title: "b", dedupeKey: "k" });
    expect(second).not.toBe(first);
    expect(store.getState().toasts).toHaveLength(2);
  });
});

describe("createToastStore — show sobre un id existente", () => {
  it("actualiza en sitio y reinicia el temporizador", () => {
    const store = createToastStore();
    store.show({ id: "fijo", title: "antes" });
    store.show({ id: "fijo", title: "después" });

    expect(store.getState().toasts).toHaveLength(1);
    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("después");
    expect(entry.restartedAt).toBe(1);
  });

  it("revive un toast closing: reusing an explicit id revives a dismissed toast", () => {
    const store = createToastStore();
    const id = store.show({ id: "fijo", title: "original" });
    store.dismiss(id);
    expect(store.getState().toasts[0]!.status).toBe("closing");
    store.show({ id: "fijo", title: "revived" });
    const entry = store.getState().toasts[0]!;
    expect(entry.status).toBe("open");
    expect(entry.title).toBe("revived");
    expect(entry.restartedAt).toBe(1);
  });
});

describe("createToastStore — update", () => {
  it("mezcla los campos indicados y conserva el resto", () => {
    const store = createToastStore();
    const id = store.show({ title: "Guardando", tone: "info" });
    store.update(id, { title: "Guardado", tone: "success" });

    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("Guardado");
    expect(entry.tone).toBe("success");
    expect(entry.id).toBe(id);
  });

  it("no reinicia el temporizador si la duración no cambia", () => {
    const store = createToastStore();
    const id = store.show({ title: "a", duration: 1000 });
    store.update(id, { title: "b" });
    expect(store.getState().toasts[0]!.restartedAt).toBe(0);
  });

  it("reinicia el temporizador cuando la duración cambia", () => {
    const store = createToastStore();
    const id = store.show({ title: "Guardando", duration: "persistent" });
    store.update(id, { title: "Guardado", duration: 3000 });
    expect(store.getState().toasts[0]!.restartedAt).toBe(1);
  });

  it("sobre un id inexistente es no-op", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    const before = store.getState();
    store.update("no-existe", { title: "b" });
    expect(store.getState()).toBe(before);
  });

  it("preserva el valor anterior si el campo es explícitamente undefined", () => {
    const store = createToastStore();
    const id = store.show({ title: "a", message: "detalle" });
    store.update(id, { title: "b", message: undefined });
    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("b");
    expect(entry.message).toBe("detalle");
  });

  it("una duración explícitamente undefined no reinicia el temporizador", () => {
    const store = createToastStore();
    const id = store.show({ title: "a", duration: 1000 });
    const beforeRestarted = store.getState().toasts[0]!.restartedAt;
    store.update(id, { title: "b", duration: undefined });
    expect(store.getState().toasts[0]!.restartedAt).toBe(beforeRestarted);
  });

  it("sobre un toast closing es no-op", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.dismiss(id);
    const beforeUpdate = store.getState();
    store.update(id, { title: "b" });
    expect(store.getState()).toBe(beforeUpdate);
    expect(store.getState().toasts[0]!.title).toBe("a");
  });
});

describe("createToastStore — cierre y retirada", () => {
  it("dismiss marca closing sin retirar la entrada", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.dismiss(id);
    expect(store.getState().toasts).toHaveLength(1);
    expect(store.getState().toasts[0]!.status).toBe("closing");
  });

  it("dismiss dos veces no emite una segunda notificación", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.dismiss(id);
    const afterFirst = store.getState();
    store.dismiss(id);
    expect(store.getState()).toBe(afterFirst);
  });

  it("remove retira la entrada", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.remove(id);
    expect(store.getState().toasts).toHaveLength(0);
  });

  it("dismissAll alcanza a los visibles y a los encolados", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    store.show({ title: "b" });
    store.show({ title: "c" });
    store.dismissAll();
    expect(
      store.getState().toasts.every((t) => t.status === "closing"),
    ).toBe(true);
  });

  it("clear vacía la store", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    store.clear();
    expect(store.getState().toasts).toHaveLength(0);
  });
});

describe("createToastStore — aislamiento entre instancias", () => {
  it("dos stores no comparten estado", () => {
    const a = createToastStore();
    const b = createToastStore();
    a.show({ title: "solo en a" });
    expect(a.getState().toasts).toHaveLength(1);
    expect(b.getState().toasts).toHaveLength(0);
  });
});
