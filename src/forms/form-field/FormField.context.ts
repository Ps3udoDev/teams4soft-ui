import { createContext, useContext } from "react";
import type * as React from "react";
import type { FormFieldClassNames } from "./FormField.types";

/**
 * Valor compartido entre `FormField.Root` y sus subcomponentes
 * (`Label`/`Control`/`Description`/`Error`), y consumible por controles
 * externos (p. ej. `TextField`, Task 5) vía `useFormFieldContext()`.
 */
export interface FormFieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  /** `invalid` explícito OR presencia de contenido de error. */
  invalid: boolean;
  required: boolean;
  optional: boolean;
  disabled: boolean;
  /** `true` solo si hay descripción Y no hay error activo (el error la reemplaza). */
  hasDescription: boolean;
  /** `true` solo si hay contenido de error. */
  hasError: boolean;
  unstyled: boolean;
  classNames?: Partial<FormFieldClassNames>;
  styles?: Partial<Record<keyof FormFieldClassNames, React.CSSProperties>>;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(
  null,
);

/**
 * Ids y estado ARIA del `FormField` más cercano, o `null` fuera de uno.
 * Pensado para que controles como `TextField` compongan `id`/`aria-*` sin
 * depender de `<FormField>` — deben seguir funcionando de forma autónoma.
 */
export function useFormFieldContext(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}

/** Uso interno: exige un `FormField.Root` ancestro (subcomponentes compuestos). */
export function useFormFieldContextOrThrow(
  componentName: string,
): FormFieldContextValue {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error(
      `${componentName} debe usarse dentro de <FormField> o <FormField.Root>.`,
    );
  }
  return context;
}
