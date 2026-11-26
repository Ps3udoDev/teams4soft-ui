import type * as React from "react";

export type FileGenerationFormat = "xlsx" | "docx" | "pdf" | "file";
export type FileGenerationSize = "sm" | "md";

export interface FileGenerationIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Formato del archivo en preparación (`xlsx`, `docx`, `pdf` o `file` genérico). */
  format: FileGenerationFormat;
  /** Tamaño de la hoja base: `sm` (32 px) o `md` (48 px). Por defecto `md`. */
  size?: FileGenerationSize;
  /** Omite clases visuales por defecto manteniendo el marcado semántico y los atributos `data-*`. */
  unstyled?: boolean;
}
