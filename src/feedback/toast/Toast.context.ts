import * as React from "react";
import type { ToastProviderProps, ToastStore } from "./Toast.types";

export interface ToastContextValue {
  store: ToastStore;
  position: NonNullable<ToastProviderProps["position"]>;
  maxVisible: number;
  defaultDuration: number;
  icons: ToastProviderProps["icons"];
  /**
   * `className`/`style` del provider. Se aplican al viewport: es el único
   * marcado que el provider posee (no envuelve a `children` en ningún nodo).
   */
  className: string | undefined;
  style: React.CSSProperties | undefined;
  classNames: ToastProviderProps["classNames"];
  styles: ToastProviderProps["styles"];
  unstyled: boolean;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error(
      "[teams4soft-ui] useToast() debe usarse dentro de un <ToastProvider>.",
    );
  }
  return context;
}
