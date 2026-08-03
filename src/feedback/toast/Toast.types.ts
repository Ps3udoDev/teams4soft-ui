import type * as React from "react";

export type ToastTone = "success" | "error" | "warning" | "info" | "neutral";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Texto alternativo para lectores de pantalla. Por defecto, `label`. */
  altText?: string;
}

export interface ToastOptions {
  id?: string;
  title: React.ReactNode;
  message?: React.ReactNode;
  /** Default `"neutral"`. */
  tone?: ToastTone;
  /** Default: el `defaultDuration` del provider. */
  duration?: number | "persistent";
  /** Reemplaza el icono del tono solo en este toast. */
  icon?: React.ReactNode;
  action?: ToastAction;
  /** Muestra el botón de cierre. Default `true`. */
  dismissible?: boolean;
  /** Evita duplicados: si ya hay un toast vivo con esta clave, se refresca. */
  dedupeKey?: string;
}

export interface ToastApi {
  show: (options: ToastOptions) => string;
  success: (options: Omit<ToastOptions, "tone">) => string;
  error: (options: Omit<ToastOptions, "tone">) => string;
  warning: (options: Omit<ToastOptions, "tone">) => string;
  info: (options: Omit<ToastOptions, "tone">) => string;
  /**
   * Actualiza los campos indicados. `update` solo mezcla los campos proporcionados
   * y preserva el resto. Pasar `undefined` en un campo NO lo borra; omitir la clave
   * y pasar `undefined` son equivalentes.
   */
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/** `closing` = animando la salida; sigue en la cola hasta que se retira. */
export type ToastStatus = "open" | "closing";

export interface ToastEntry extends ToastOptions {
  id: string;
  tone: ToastTone;
  dismissible: boolean;
  status: ToastStatus;
  createdAt: number;
  /**
   * Se incrementa cuando el temporizador debe reiniciarse. El viewport lo
   * incluye en la `key` de React para forzar el remontaje del `Toast.Root`,
   * que es la única forma de que la primitiva reinicie su cuenta atrás.
   */
  restartedAt: number;
}

export interface ToastStoreState {
  toasts: ToastEntry[];
}

export interface ToastStoreConfig {
  /** Tope de entradas en la store. Default 50. */
  maxQueued?: number;
}

export interface ToastStore extends ToastApi {
  /** Devuelve SIEMPRE la misma referencia entre mutaciones (requisito de useSyncExternalStore). */
  getState: () => ToastStoreState;
  /** Snapshot constante para SSR. */
  getServerState: () => ToastStoreState;
  subscribe: (listener: () => void) => () => void;
  /** Retira definitivamente una entrada, tras la animación de salida. */
  remove: (id: string) => void;
  /** Vacía la store sin animación. Se usa al desmontar el provider global. */
  clear: () => void;
}

export interface ToastClassNames {
  viewport: string;
  root: string;
  icon: string;
  content: string;
  title: string;
  message: string;
  action: string;
  closeButton: string;
  progress: string;
}

export interface ToastProviderProps {
  children?: React.ReactNode;
  /** Default `"top-right"`. */
  position?: ToastPosition;
  /** Cuántos se renderizan a la vez. El resto espera en cola. Default 4. */
  maxVisible?: number;
  /** Milisegundos por defecto. Default 4000. */
  defaultDuration?: number;
  /** Tope de entradas en la store. Default 50. */
  maxQueued?: number;
  /** Conecta este provider a la store del módulo, habilitando el `toast` importable. Default `false`. */
  global?: boolean;
  /** Reemplaza globalmente la iconografía por tono. */
  icons?: Partial<Record<ToastTone, React.ReactNode>>;
  /** Default `true`. Ponlo en `false` para colocar `<ToastViewport />` a mano. */
  renderViewport?: boolean;
  className?: string;
  classNames?: Partial<ToastClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ToastClassNames, React.CSSProperties>>;
}
