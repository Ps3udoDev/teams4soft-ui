import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { devWarn } from "../../lib";
import { ToastContext } from "./Toast.context";
import { createToastStore } from "./toast-store";
import {
  claimGlobalToastStore,
  defaultToastStore,
  releaseGlobalToastStore,
} from "./toast-global";
import { ToastViewport } from "./ToastViewport";
import type { ToastPosition, ToastProviderProps } from "./Toast.types";

/** Radix admite una sola dirección de swipe; se deriva de la posición. */
const swipeDirectionByPosition: Record<
  ToastPosition,
  "right" | "left" | "up" | "down"
> = {
  "top-left": "left",
  "top-center": "up",
  "top-right": "right",
  "bottom-left": "left",
  "bottom-center": "down",
  "bottom-right": "right",
};

/**
 * Provider de toasts. Sin `global` mantiene una store privada, de modo que
 * varias instancias (Storybook, pruebas) no se pisan. Con `global` atiende
 * además al `toast` importable desde fuera de React.
 */
export function ToastProvider({
  children,
  position = "top-right",
  maxVisible = 4,
  defaultDuration = 4000,
  maxQueued: maxQueuedProp,
  global: isGlobal = false,
  icons,
  renderViewport = true,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: ToastProviderProps): React.ReactElement {
  // `defaultToastStore` (ver toast-global.ts) ya existe con su propio tope
  // cuando este provider se monta: `maxQueued` solo puede aplicarse a una
  // store que se cree aquí, es decir, a la store privada. Con `global`, pasar
  // `maxQueued` explícitamente no hace nada — se avisa más abajo en vez de
  // reconfigurar en silencio una store en la que puede haber otro código
  // escribiendo ya.
  if (isGlobal && maxQueuedProp !== undefined) {
    devWarn(
      "`maxQueued` se ignora en <ToastProvider global />: la store global ya existe con su propio tope y este prop solo aplica al crear una store nueva (sin `global`).",
    );
  }
  const maxQueued = maxQueuedProp ?? 50;
  const [privateStore] = React.useState(() => createToastStore({ maxQueued }));
  const store = isGlobal ? defaultToastStore : privateStore;

  // La reclamación va en un efecto, no en render: en StrictMode el cuerpo del
  // componente se ejecuta dos veces y reclamaríamos dos veces la misma store.
  const [globalReady, setGlobalReady] = React.useState(false);
  React.useEffect(() => {
    if (!isGlobal) return;
    const won = claimGlobalToastStore();
    setGlobalReady(won);
    if (!won) return;
    return () => {
      setGlobalReady(false);
      releaseGlobalToastStore();
    };
  }, [isGlobal]);

  const contextValue = React.useMemo(
    () => ({
      store,
      position,
      maxVisible,
      defaultDuration,
      icons,
      className,
      style,
      classNames,
      styles,
      unstyled,
    }),
    [
      store,
      position,
      maxVisible,
      defaultDuration,
      icons,
      className,
      style,
      classNames,
      styles,
      unstyled,
    ],
  );

  // Con `global`, solo el provider que ganó la reclamación pinta la cola; así
  // una segunda instancia mal configurada no duplica los mensajes en pantalla.
  const shouldRenderViewport = renderViewport && (!isGlobal || globalReady);

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitive.Provider
        swipeDirection={swipeDirectionByPosition[position]}
        duration={defaultDuration}
      >
        {children}
        {shouldRenderViewport ? <ToastViewport /> : null}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = "ToastProvider";
