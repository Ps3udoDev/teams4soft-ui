import { devWarn } from "../../lib";
import { createToastStore } from "./toast-store";
import type { ToastApi, ToastOptions, ToastStore } from "./Toast.types";

/**
 * Store compartida por el objeto `toast` importable y por el `ToastProvider`
 * que declare `global`.
 *
 * API **client-only**: en SSR una store a nivel de módulo se compartiría entre
 * peticiones y filtraría mensajes de un usuario a otro. Solo debe escribirse
 * desde código de cliente, y el provider `global` la vacía al desmontarse.
 */
export const defaultToastStore: ToastStore = createToastStore();

let claimed = false;

/** `true` si esta instancia toma el control de la store global. Gana la primera. */
export function claimGlobalToastStore(): boolean {
  if (claimed) {
    devWarn(
      "Hay más de un <ToastProvider global />. Solo el primero montado atiende al `toast` importable; retira los demás o quítales el prop `global`.",
    );
    return false;
  }
  claimed = true;
  return true;
}

export function releaseGlobalToastStore(): void {
  claimed = false;
  defaultToastStore.clear();
}

function warnIfUnclaimed(): void {
  if (!claimed) {
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
