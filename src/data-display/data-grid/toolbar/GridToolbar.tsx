import type * as React from "react";
import { cn } from "../../../lib";

export interface GridToolbarProps {
  children?: React.ReactNode;
  toggler?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  unstyled?: boolean;
}

/** Contenido de la página y controles de columnas en una sola barra. */
export function GridToolbar({ children, toggler, className, style, unstyled = false }: GridToolbarProps) {
  if (!children && !toggler) return null;
  return (
    <div data-slot="toolbar" className={cn(!unstyled && "flex flex-wrap items-center justify-between gap-2", className)} style={style}>
      {children}
      {toggler}
    </div>
  );
}
