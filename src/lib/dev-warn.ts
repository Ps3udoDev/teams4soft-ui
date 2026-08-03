/**
 * Emite una advertencia de desarrollo prefijada, solo fuera de producción.
 * Centraliza el patrón usado por varios módulos (`toast-store`, `toast-global`,
 * `ToastViewport`, y los que se sumen después) para no duplicarlo.
 */
export function devWarn(message: string): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}
