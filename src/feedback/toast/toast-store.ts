import { devWarn } from "../../lib";
import type {
  ToastEntry,
  ToastOptions,
  ToastStore,
  ToastStoreConfig,
  ToastStoreState,
} from "./Toast.types";

/**
 * Duración de la animación de salida. La retirada de la cola se programa con
 * este valor en lugar de escuchar el fin de la transición: en jsdom y con
 * `prefers-reduced-motion` ese evento no llega nunca, y las entradas cerradas
 * se quedarían para siempre en la cola.
 */
export const TOAST_EXIT_MS = 150;

const DEFAULT_MAX_QUEUED = 50;

/**
 * `Infinity` no sirve como duración: `setTimeout` coacciona su argumento a
 * int32, así que colapsa a `0` y el toast se cerraría de inmediato. El máximo
 * entero de 32 bits equivale a ~24 días, que a efectos prácticos es "nunca".
 */
const PERSISTENT_DURATION = 2_147_483_647;

/** Traduce la duración pública a los milisegundos que espera la primitiva. */
export function resolveToastDuration(
  duration: number | "persistent" | undefined,
  fallback: number,
): number {
  if (duration === "persistent") return PERSISTENT_DURATION;
  return duration ?? fallback;
}

const EMPTY_STATE: ToastStoreState = { toasts: [] };

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `ui-toast-${idCounter}`;
}

/** Filtra las entradas con valor undefined, preservando el tipo. */
function stripUndefined<T extends object>(source: T): T {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  ) as T;
}

/**
 * Store de toasts independiente de React. La consume `ToastProvider` vía
 * `useSyncExternalStore`, y también el objeto `toast` importable, que es lo
 * que permite lanzar mensajes desde interceptores HTTP o capas de servicio.
 */
export function createToastStore(config: ToastStoreConfig = {}): ToastStore {
  const maxQueued = config.maxQueued ?? DEFAULT_MAX_QUEUED;

  // `state` se reemplaza entero en cada mutación y se devuelve tal cual en
  // `getState`. `useSyncExternalStore` compara snapshots por identidad: si
  // devolviéramos un objeto literal nuevo en cada llamada, entraría en un
  // bucle infinito de renders.
  let state: ToastStoreState = EMPTY_STATE;
  const listeners = new Set<() => void>();

  function commit(toasts: ToastEntry[]): void {
    state = { toasts };
    for (const listener of listeners) listener();
  }

  function indexOf(id: string): number {
    return state.toasts.findIndex((entry) => entry.id === id);
  }

  function replaceAt(index: number, entry: ToastEntry): void {
    const next = state.toasts.slice();
    next[index] = entry;
    commit(next);
  }

  /** Mezcla `options` sobre la entrada `index`, decidiendo si reinicia el temporizador. */
  function patch(
    index: number,
    options: Partial<ToastOptions>,
    forceRestart: boolean,
  ): void {
    const previous = state.toasts[index]!;

    // Se descartan los valores undefined para evitar borrar campos existentes.
    const stripped = stripUndefined(options);

    const durationChanged =
      stripped.duration !== undefined && stripped.duration !== previous.duration;

    replaceAt(index, {
      ...previous,
      ...stripped,
      id: previous.id,
      status: "open",
      restartedAt:
        forceRestart || durationChanged
          ? previous.restartedAt + 1
          : previous.restartedAt,
    });
  }

  function show(options: ToastOptions): string {
    if (options.dedupeKey !== undefined) {
      const index = state.toasts.findIndex(
        (entry) =>
          entry.dedupeKey === options.dedupeKey && entry.status === "open",
      );
      if (index >= 0) {
        const id = state.toasts[index]!.id;
        patch(index, options, true);
        return id;
      }
    }

    if (options.id !== undefined) {
      const index = indexOf(options.id);
      if (index >= 0) {
        // show() con un id explícito SÍ revive un toast en estado `closing` y reinicia
        // el temporizador, porque quien reutiliza ese id lo hace a propósito. update()
        // en cambio NO lo revive: una promesa tardía no debe traer de vuelta un mensaje
        // que el usuario ya descartó.
        patch(index, options, true);
        return options.id;
      }
    }

    const entry: ToastEntry = {
      ...options,
      id: options.id ?? nextId(),
      tone: options.tone ?? "neutral",
      dismissible: options.dismissible ?? true,
      status: "open",
      createdAt: Date.now(),
      restartedAt: 0,
    };

    let next = [...state.toasts, entry];
    if (next.length > maxQueued) {
      devWarn(
        `La cola de toasts superó maxQueued (${maxQueued}). Se descartan los más antiguos.`,
      );
      next = next.slice(next.length - maxQueued);
    }
    commit(next);
    return entry.id;
  }

  function update(id: string, options: Partial<ToastOptions>): void {
    const index = indexOf(id);
    if (index < 0) {
      devWarn(`update() sobre un toast inexistente o ya retirado: "${id}".`);
      return;
    }
    const entry = state.toasts[index]!;
    if (entry.status === "closing") {
      devWarn(`update() sobre un toast inexistente o ya retirado: "${id}".`);
      return;
    }
    patch(index, options, false);
  }

  function dismiss(id: string): void {
    const index = indexOf(id);
    if (index < 0) return;
    const entry = state.toasts[index]!;
    if (entry.status === "closing") return;
    replaceAt(index, { ...entry, status: "closing" });
  }

  function dismissAll(): void {
    if (state.toasts.every((entry) => entry.status === "closing")) return;
    commit(
      state.toasts.map((entry) =>
        entry.status === "closing" ? entry : { ...entry, status: "closing" },
      ),
    );
  }

  function remove(id: string): void {
    const index = indexOf(id);
    if (index < 0) return;
    commit(state.toasts.filter((entry) => entry.id !== id));
  }

  function clear(): void {
    if (state.toasts.length === 0) return;
    commit([]);
  }

  const withTone =
    (tone: ToastEntry["tone"]) =>
    (options: Omit<ToastOptions, "tone">): string =>
      show({ ...options, tone });

  return {
    getState: () => state,
    getServerState: () => EMPTY_STATE,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    show,
    success: withTone("success"),
    error: withTone("error"),
    warning: withTone("warning"),
    info: withTone("info"),
    update,
    dismiss,
    dismissAll,
    remove,
    clear,
  };
}
