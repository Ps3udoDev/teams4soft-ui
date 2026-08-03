import { devWarn } from "../../lib";
import { createToastStore } from "./toast-store";
import type { ToastApi, ToastOptions, ToastStore } from "./Toast.types";

/**
 * Slot compartido en `globalThis` para la store del `toast` importable.
 *
 * ¿Por qué `globalThis` y no una constante de módulo? `tsup.config.ts` compila
 * cinco entradas con `splitting: false`, así que este archivo se inlina por
 * separado dentro de `dist/index.js`, `dist/feedback.js`, `dist/index.cjs` y
 * `dist/feedback.cjs`. Con estado a nivel de módulo, cada uno de esos cuatro
 * bundles tendría su propia `defaultToastStore` y su propio `claimed`: cuatro
 * singletons independientes que no se enteran unos de otros. El propio README
 * sugiere `import { ToastProvider } from "@teams4soft/teams4soft-ui"` junto a
 * `import { toast } from "@teams4soft/teams4soft-ui/feedback"` — con estado de
 * módulo, el segundo import escribiría en una store que nadie observa y el
 * primero avisaría (equivocadamente) de que falta un provider. Colgar el
 * estado de una clave `Symbol.for()` en `globalThis` hace que las cuatro
 * copias — e incluso dos copias del paquete instaladas a la vez, que ninguna
 * variable de módulo podría arreglar — compartan la misma instancia: la
 * primera copia que se carga la crea, el resto la reutiliza. NO lo devuelvas
 * a una variable de módulo: eso reintroduciría el bug en silencio.
 */
const GLOBAL_TOAST_KEY = Symbol.for("@teams4soft/teams4soft-ui.toast");

interface GlobalToastSlot {
  store: ToastStore;
  claimed: boolean;
}

/** Tipo interno y angosto: solo describe la clave que este módulo escribe en `globalThis`. */
type GlobalThisWithToastSlot = typeof globalThis & {
  [GLOBAL_TOAST_KEY]?: GlobalToastSlot;
};

/**
 * `globalThis` existe tanto en el navegador como en Node (SSR), así que leer o
 * crear el slot aquí no depende del DOM y no lanza en SSR.
 */
function getGlobalToastSlot(): GlobalToastSlot {
  const target = globalThis as GlobalThisWithToastSlot;
  const existing = target[GLOBAL_TOAST_KEY];
  if (existing) return existing;

  const created: GlobalToastSlot = {
    store: createToastStore(),
    claimed: false,
  };
  target[GLOBAL_TOAST_KEY] = created;
  return created;
}

const globalToastSlot = getGlobalToastSlot();

/**
 * Store compartida por el objeto `toast` importable y por el `ToastProvider`
 * que declare `global`.
 *
 * API **client-only**: en SSR una store a nivel de módulo se compartiría entre
 * peticiones y filtraría mensajes de un usuario a otro. Solo debe escribirse
 * desde código de cliente, y el provider `global` la vacía al desmontarse.
 */
export const defaultToastStore: ToastStore = globalToastSlot.store;

/** `true` si esta instancia toma el control de la store global. Gana la primera. */
export function claimGlobalToastStore(): boolean {
  if (globalToastSlot.claimed) {
    devWarn(
      "Hay más de un <ToastProvider global />. Solo el primero montado atiende al `toast` importable; retira los demás o quítales el prop `global`.",
    );
    return false;
  }
  globalToastSlot.claimed = true;
  return true;
}

export function releaseGlobalToastStore(): void {
  globalToastSlot.claimed = false;
  defaultToastStore.clear();
}

function warnIfUnclaimed(): void {
  if (!globalToastSlot.claimed) {
    devWarn(
      "Se usó el `toast` importable sin ningún <ToastProvider global /> montado. El mensaje queda en cola y se mostrará cuando se monte.",
    );
  }
}

/**
 * API imperativa llamable desde cualquier parte, incluido código fuera de
 * React (interceptores HTTP, capas de servicio). Requiere un
 * `<ToastProvider global />` montado para que los mensajes se vean.
 */
export const toast: ToastApi = {
  show: (options: ToastOptions) => {
    warnIfUnclaimed();
    return defaultToastStore.show(options);
  },
  success: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.success(options);
  },
  error: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.error(options);
  },
  warning: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.warning(options);
  },
  info: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.info(options);
  },
  update: (id, options) => defaultToastStore.update(id, options),
  dismiss: (id) => defaultToastStore.dismiss(id),
  dismissAll: () => defaultToastStore.dismissAll(),
};
