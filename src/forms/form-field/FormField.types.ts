import type * as React from "react";

/** Slots personalizables vía `classNames`/`styles`. */
export interface FormFieldClassNames {
  root: string;
  label: string;
  requiredIndicator: string;
  optionalIndicator: string;
  control: string;
  description: string;
  error: string;
}

/** Props compartidas por la API de conveniencia y `FormField.Root`. */
export interface FormFieldSharedProps {
  /** Id estable del control. Por defecto se genera con `useId`. */
  id?: string;
  required?: boolean;
  /** Informativo: no agrega validación, solo comunica que el campo es opcional. */
  optional?: boolean;
  /** Marca el campo como inválido incluso sin `errorMessage` (p. ej. validación externa). */
  invalid?: boolean;
  disabled?: boolean;
  /** Reserva la altura del área de mensaje para evitar saltos de layout. */
  reserveMessageSpace?: boolean;
  className?: string;
  classNames?: Partial<FormFieldClassNames>;
  /** Conserva estructura, ids y atributos ARIA; omite clases visuales. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof FormFieldClassNames, React.CSSProperties>>;
}

/** Props de la API de conveniencia `<FormField>`. */
export interface FormFieldProps extends FormFieldSharedProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /** Único control (recibe `id`, `aria-*` y `disabled` por composición). */
  children: React.ReactElement;
}

/**
 * Props de `FormField.Root` (API compuesta). Extiende los atributos HTML de
 * `<div>` (menos los que `FormFieldSharedProps`/`children` ya redeclaran)
 * para que el `...rest` que `FormFieldRoot` reenvía a la raíz sea alcanzable
 * a nivel de tipos por consumidores externos (p. ej. `data-*`, `onClick`).
 */
export interface FormFieldRootProps
  extends FormFieldSharedProps,
    Omit<
      React.HTMLAttributes<HTMLDivElement>,
      keyof FormFieldSharedProps | "children"
    > {
  children?: React.ReactNode;
}

export interface FormFieldLabelProps
  extends Omit<
    React.LabelHTMLAttributes<HTMLLabelElement>,
    "htmlFor" | "className" | "style"
  > {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface FormFieldControlProps {
  /** Único control (recibe `id`, `aria-*` y `disabled` por composición). */
  children: React.ReactElement;
}

export interface FormFieldMessageProps
  extends Omit<
    React.HTMLAttributes<HTMLParagraphElement>,
    "id" | "className" | "style"
  > {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export type FormFieldDescriptionProps = FormFieldMessageProps;
export type FormFieldErrorProps = FormFieldMessageProps;
