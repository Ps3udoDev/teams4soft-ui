import { useToastContext } from "./Toast.context";
import type { ToastApi } from "./Toast.types";

/**
 * API imperativa del `ToastProvider` más cercano. Para lanzar toasts desde
 * fuera de React, usa el objeto `toast` importable con `<ToastProvider global />`.
 */
export function useToast(): ToastApi {
  const { store } = useToastContext();
  return store;
}
