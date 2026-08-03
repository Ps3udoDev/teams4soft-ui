import type * as React from "react";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Default `"md"`. */
  size?: SpinnerSize;
  /** Nombre accesible cuando el spinner comunica carga. Ignorado si `decorative`. */
  label?: string;
  /** Marca el spinner como puramente decorativo (`aria-hidden`). Default `false`. */
  decorative?: boolean;
  /** Conserva la estructura y el forwarding de props; omite las clases visuales. */
  unstyled?: boolean;
}
