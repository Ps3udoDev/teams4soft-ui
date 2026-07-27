import type * as React from "react";

/** Slots personalizables vía `classNames`/`styles`. */
export interface FieldsetClassNames {
  root: string;
  legend: string;
  description: string;
  content: string;
  error: string;
}

export interface FieldsetProps
  extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "title"> {
  /** Título semántico del grupo, renderizado en un `<legend>` nativo. */
  legend: React.ReactNode;
  /** Se oculta automáticamente cuando hay `errorMessage`: el error reemplaza a la descripción. */
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /** Se combina (OR) con la presencia de contenido en `errorMessage`. */
  invalid?: boolean;
  /** Comunica que el grupo exige selección; la validación concreta pertenece a los controles/formulario. */
  required?: boolean;
  /** Controla el layout del slot `content`. */
  orientation?: "vertical" | "horizontal";
  className?: string;
  classNames?: Partial<FieldsetClassNames>;
  /** Conserva estructura, comportamiento y accesibilidad; omite clases visuales. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof FieldsetClassNames, React.CSSProperties>>;
}
