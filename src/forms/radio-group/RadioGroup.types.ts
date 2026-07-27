import type * as React from "react";

/** Una opción del grupo. `value` es el identificador semántico público. */
export interface RadioOption<TValue extends string> {
  value: TValue;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

/** Slots personalizables vía `classNames`/`styles`. */
export interface RadioGroupClassNames {
  root: string;
  label: string;
  description: string;
  options: string;
  option: string;
  control: string;
  indicator: string;
  optionContent: string;
  optionLabel: string;
  optionDescription: string;
  error: string;
}

export interface RadioGroupProps<TValue extends string> {
  name?: string;
  label?: React.ReactNode;
  /** Se oculta automáticamente cuando hay `errorMessage`: el error reemplaza a la descripción. */
  description?: React.ReactNode;
  value?: TValue;
  defaultValue?: TValue;
  /**
   * Callback semántico: Radix emite `string`, se castea a `TValue` porque
   * los valores siempre provienen de `options[].value` (que ya es `TValue`).
   */
  onValueChange?: (value: TValue) => void;
  options: RadioOption<TValue>[];
  /** Controla el layout Y la semántica de navegación por flechas (roving tabindex de Radix). */
  orientation?: "horizontal" | "vertical";
  required?: boolean;
  disabled?: boolean;
  /** Se combina (OR) con la presencia de contenido en `errorMessage`. */
  invalid?: boolean;
  errorMessage?: React.ReactNode;
  /**
   * Renderiza contenido personalizado (p. ej. tarjetas seleccionables)
   * DENTRO del `RadioGroupPrimitive.Item` de cada opción, preservando su
   * `role="radio"` nativo.
   *
   * `state.checked` es un valor best-effort calculado a partir de
   * `value`/`defaultValue` en el momento del render: en modo no controlado
   * (sin `value`), este componente no rastrea el estado interno de Radix,
   * por lo que `state.checked` puede no reflejar el estado real tras la
   * primera interacción. El estado real y fiable vive en el atributo DOM
   * `data-state="checked"` que Radix aplica al `Item`; para estilos usa
   * siempre el selector `data-[state=checked]` en `classNames.option`/
   * `classNames.control`, nunca `state.checked`.
   */
  renderOption?: (
    option: RadioOption<TValue>,
    state: { checked: boolean; disabled: boolean },
  ) => React.ReactNode;
  className?: string;
  classNames?: Partial<RadioGroupClassNames>;
  /** Conserva las primitivas y los atributos; elimina estilos visuales base. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof RadioGroupClassNames, React.CSSProperties>>;
}
