import type * as React from "react";

/** Variantes visuales cerradas del botón. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

/** Tamaños cerrados del botón. `icon` produce una caja cuadrada sin texto. */
export type ButtonSize = "sm" | "md" | "lg" | "icon";

/** Slots personalizables vía `classNames`/`styles`. */
export interface ButtonClassNames {
  root: string;
  content: string;
  leadingIcon: string;
  trailingIcon: string;
  spinner: string;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Bloquea la acción, añade `aria-busy` y muestra el spinner sin perder el ancho. */
  loading?: boolean;
  /** Texto anunciado a lectores de pantalla mientras `loading` está activo. */
  loadingLabel?: string;
  /** Icono antes del contenido. Siempre `ReactNode`, nunca un nombre de clase. */
  leadingIcon?: React.ReactNode;
  /** Icono después del contenido. Se oculta mientras `loading` está activo. */
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Compone con un único hijo (p. ej. un `<a>`) vía Radix `Slot` sin anidar `<button>`. */
  asChild?: boolean;
  className?: string;
  classNames?: Partial<ButtonClassNames>;
  /** Conserva estructura, semántica y protección de doble acción; omite clases visuales. */
  unstyled?: boolean;
  styles?: Partial<Record<keyof ButtonClassNames, React.CSSProperties>>;
}
