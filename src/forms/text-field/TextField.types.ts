import type * as React from "react";

/** Tamaños cerrados del campo. */
export type TextFieldSize = "sm" | "md" | "lg";

/** Slots personalizables vía `classNames`/`styles`. */
export interface TextFieldClassNames {
  root: string;
  input: string;
  leading: string;
  trailing: string;
  clearButton: string;
  passwordToggle: string;
}

export interface TextFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "size"
  > {
  value?: string;
  defaultValue?: string;
  /** Callback semántico: se dispara con el valor acumulado en cada cambio. */
  onValueChange?: (value: string) => void;
  size?: TextFieldSize;
  /** Contenido antes del input (icono, prefijo). */
  leading?: React.ReactNode;
  /** Contenido después del input (icono, sufijo). Convive con `loading`/`revealPassword`. */
  trailing?: React.ReactNode;
  /** Muestra un botón para vaciar el valor cuando hay contenido. */
  clearable?: boolean;
  onClear?: () => void;
  /** Habilita el toggle mostrar/ocultar cuando `type="password"`. */
  revealPassword?: boolean;
  /** Se combina (OR) con el `invalid` del `FormField` ancestro, si existe. */
  invalid?: boolean;
  /** Muestra un spinner en el slot trailing sin bloquear la escritura. */
  loading?: boolean;
  className?: string;
  classNames?: Partial<TextFieldClassNames>;
  /** Conserva estructura, comportamiento y accesibilidad; omite clases visuales. */
  unstyled?: boolean;
  styles?: Partial<Record<keyof TextFieldClassNames, React.CSSProperties>>;
}
