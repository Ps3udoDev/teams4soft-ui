// Los componentes de feedback se exportan aquí a medida que se implementan.
// Ver docs/superpowers/specs/2026-08-02-fase-3a-feedback-design.md.
export { ToastProvider } from "./toast/ToastProvider";
export { ToastViewport } from "./toast/ToastViewport";
export { useToast } from "./toast/useToast";
export { toast } from "./toast/toast-global";
export { createToastStore } from "./toast/toast-store";
export type {
  ToastTone,
  ToastPosition,
  ToastAction,
  ToastOptions,
  ToastApi,
  ToastClassNames,
  ToastProviderProps,
  ToastStore,
  ToastStoreConfig,
  ToastEntry,
} from "./toast/Toast.types";
