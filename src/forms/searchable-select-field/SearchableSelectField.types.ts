import type * as React from "react";
import type { ResolutionStrategy } from "./select-utils";

export type { ResolutionStrategy };

/**
 * Qué hacer cuando el texto confirmado no resuelve a ninguna opción.
 * `show-error` (por defecto) nunca borra en silencio lo que se escribió.
 */
export type UnmatchedBehavior = "show-error" | "revert" | "clear";

/** Slots personalizables vía `classNames`/`styles`. */
export interface SearchableSelectFieldClassNames {
  root: string;
  label: string;
  control: string;
  input: string;
  trigger: string;
  clearButton: string;
  popover: string;
  listbox: string;
  option: string;
  empty: string;
  description: string;
  error: string;
}

export interface SearchableSelectFieldProps<TOption, TValue> {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  /** Se oculta automáticamente cuando hay `errorMessage`: el error la reemplaza. */
  description?: React.ReactNode;
  placeholder?: string;

  /** Valor confirmado. El campo es controlado en `value`. */
  value: TValue | null;
  onValueChange: (value: TValue | null, option: TOption | null) => void;

  /** Texto del input; controlado si se pasa, si no usa `defaultInputValue`. */
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;

  /** Nunca se muta: el orden y el contenido recibidos se respetan. */
  options: TOption[];
  getOptionValue: (option: TOption) => TValue;
  getOptionLabel: (option: TOption) => string;
  getOptionDisabled?: (option: TOption) => boolean;
  /** Términos alternativos de búsqueda que no ensucian la etiqueta. */
  getOptionKeywords?: (option: TOption) => string[];

  /** Reemplaza el filtro por defecto (subcadena sin diacríticos). */
  filterOption?: (option: TOption, query: string) => boolean;
  /** Orden de intentos al resolver texto libre. */
  resolutionStrategy?: ResolutionStrategy[];
  /** Se aplica sobre una COPIA de `options`. */
  sortOptions?: (a: TOption, b: TOption) => number;
  /** Default `"show-error"`. */
  unmatchedBehavior?: UnmatchedBehavior;

  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  /** Se combina (OR) con la presencia de `errorMessage` y con el texto sin resolver. */
  invalid?: boolean;
  errorMessage?: React.ReactNode;

  /** Default `false`: no se selecciona nada sin una acción explícita. */
  autoSelectFirst?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  emptyMessage?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: React.ReactNode;

  /** Debe renderizar solo el contenido: el `role="option"` lo pone el campo. */
  renderOption?: (
    option: TOption,
    state: { selected: boolean; active: boolean },
  ) => React.ReactNode;
  /**
   * Adorno decorativo (icono, bandera, código…) que se muestra dentro del
   * control, antes del input, cuando hay una opción seleccionada. No sustituye
   * al texto del input: en un combobox editable ese texto debe seguir siendo
   * la etiqueta, para poder corregirla. Se renderiza con `aria-hidden`.
   */
  renderValue?: (option: TOption) => React.ReactNode;

  /** Expone el input para foco programático (la firma genérica impide `forwardRef`). */
  inputRef?: React.Ref<HTMLInputElement>;

  className?: string;
  classNames?: Partial<SearchableSelectFieldClassNames>;
  /** Conserva comportamiento y accesibilidad; elimina solo las clases visuales. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<
    Record<keyof SearchableSelectFieldClassNames, React.CSSProperties>
  >;
}
