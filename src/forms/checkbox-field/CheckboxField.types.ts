import type * as React from "react";

/** Estado semántico de Radix Checkbox: booleano o selección parcial. */
export type CheckedState = boolean | "indeterminate";

/** Slots personalizables vía `classNames`/`styles`. */
export interface CheckboxFieldClassNames {
  root: string;
  control: string;
  indicator: string;
  content: string;
  label: string;
  description: string;
  error: string;
}

export interface CheckboxFieldProps {
  id?: string;
  name?: string;
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  /**
   * Callback semántico: recibe el estado tal cual lo emite Radix
   * (`boolean | "indeterminate"`). Nunca se convierte a `"true"`/`"false"`.
   */
  onCheckedChange?: (checked: CheckedState) => void;
  value?: string;
  /** Etiqueta del control. Se asocia vía `<label htmlFor>`: el texto completo es clicable. */
  label: React.ReactNode;
  /** Se oculta automáticamente cuando hay `errorMessage`: el error reemplaza a la descripción. */
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Se combina (OR) con la presencia de contenido en `errorMessage`. */
  invalid?: boolean;
  /** Contenido del indicador cuando el estado es `true`. Por defecto, un check. */
  indicator?: React.ReactNode;
  /** Contenido del indicador cuando el estado es `"indeterminate"`. Por defecto, un guion. */
  indeterminateIndicator?: React.ReactNode;
  className?: string;
  classNames?: Partial<CheckboxFieldClassNames>;
  /** Conserva la primitiva, el label y los atributos; elimina estilos visuales base. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof CheckboxFieldClassNames, React.CSSProperties>>;
}
