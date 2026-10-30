import type { ReactNode } from "react";
import { devWarn } from "../../lib";
import { createLoadingStore } from "./loading-store";
import type { LoadingApi, LoadingOptions, LoadingStore } from "./Loading.types";

const GLOBAL_LOADING_KEY = Symbol.for("@teams4soft/teams4soft-ui.loading");
interface GlobalLoadingSlot {
  store: LoadingStore;
  claimed: boolean;
  generation: number;
  releasePending: boolean;
  lease: number;
}
type GlobalWithLoading = typeof globalThis & { [GLOBAL_LOADING_KEY]?: GlobalLoadingSlot };
const target = globalThis as GlobalWithLoading;
// tsup duplicates this module into every entry point: the slot must remain global.
const slot = target[GLOBAL_LOADING_KEY] ??= {
  store: createLoadingStore(), claimed: false, generation: 0, releasePending: false, lease: 0,
};

export const defaultLoadingStore = slot.store;

export function claimGlobalLoadingStore(): boolean {
  if (slot.claimed && !slot.releasePending) {
    devWarn("Hay más de un <LoadingProvider global />. Solo el primero montado atiende al objeto loading importable.");
    return false;
  }
  slot.claimed = true;
  slot.releasePending = false;
  slot.lease += 1;
  return true;
}

/** Defer only ownership release, so child effect cleanup can call hide safely. */
export function releaseGlobalLoadingStore(defer = false): void {
  slot.generation += 1;
  slot.store.clear();
  const lease = ++slot.lease;
  slot.releasePending = defer;
  if (!defer) { slot.claimed = false; return; }
  queueMicrotask(() => {
    // A StrictMode replay or a new provider may already have reclaimed the slot.
    if (slot.lease !== lease) return;
    slot.claimed = false;
    slot.releasePending = false;
  });
}

function warnIfUnclaimed(): void {
  if (!slot.claimed) {
    devWarn("Se usó loading sin ningún <LoadingProvider global /> montado. La carga queda pendiente hasta que se monte.");
  }
}

function optionsFrom(message: ReactNode | LoadingOptions): LoadingOptions {
  // React elements and portals are objects too. Do not treat them as options.
  if (message !== null && typeof message === "object" && !Array.isArray(message) && !("$$typeof" in message) &&
      ("message" in message || "indicator" in message || Object.getPrototypeOf(message) === Object.prototype)) {
    return message as LoadingOptions;
  }
  return { message: message as ReactNode };
}

/** Client-side API; wraps started by an old provider cannot hide a new session. */
export const loading: LoadingApi = {
  show(message) {
    warnIfUnclaimed();
    slot.store.show(optionsFrom(message));
  },
  hide() {
    warnIfUnclaimed();
    slot.store.hide();
  },
  wrap<T>(promise: Promise<T>, message?: ReactNode | LoadingOptions): Promise<T> {
    warnIfUnclaimed();
    const generation = slot.generation;
    slot.store.show(optionsFrom(message));
    return promise.finally(() => {
      if (slot.generation === generation) slot.store.hide();
    });
  },
};
