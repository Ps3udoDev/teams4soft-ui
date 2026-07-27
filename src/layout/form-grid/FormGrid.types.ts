import type * as React from "react";

/** Puntos de ruptura soportados, mobile-first: `base` no lleva prefijo. */
export type ResponsiveBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Valor escalar o resuelto por punto de ruptura. Todas las combinaciones
 * posibles se mapean a clases Tailwind literales (ver `FormGrid.tsx`):
 * Tailwind no detecta clases construidas dinámicamente en ejecución.
 */
export type ResponsiveValue<T> = T | Partial<Record<ResponsiveBreakpoint, T>>;

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Número de columnas del grid, opcionalmente por punto de ruptura. */
  columns?: ResponsiveValue<1 | 2 | 3 | 4 | 6 | 12>;
  gap?: "none" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "stretch";
  /** Activa `grid-flow-dense`. No debe usarse para alterar el orden de lectura. */
  dense?: boolean;
  className?: string;
  /** Conserva estructura y forwarding de props; omite clases visuales. */
  unstyled?: boolean;
}

export interface FormGridItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Cantidad de columnas que ocupa el item, opcionalmente por punto de ruptura. */
  span?: ResponsiveValue<1 | 2 | 3 | 4 | 6 | 12 | "full">;
  /** Línea de inicio del item, opcionalmente por punto de ruptura. */
  start?: ResponsiveValue<number | "auto">;
  className?: string;
  unstyled?: boolean;
}
