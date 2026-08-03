import type * as React from "react";

export type ProgressTone = "primary" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressClassNames {
  root: string;
  track: string;
  indicator: string;
  label: string;
  value: string;
}

export interface ProgressProps {
  /** Ausente = progreso indeterminado (sin `aria-valuenow`). Se recorta a `[0, max]`. */
  value?: number;
  /** Default 100. */
  max?: number;
  label?: React.ReactNode;
  /** Muestra el porcentaje redondeado. Se ignora si es indeterminado. */
  showValue?: boolean;
  /** Default `"primary"`. */
  tone?: ProgressTone;
  /** Default `"md"`. */
  size?: ProgressSize;
  className?: string;
  classNames?: Partial<ProgressClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ProgressClassNames, React.CSSProperties>>;
}
