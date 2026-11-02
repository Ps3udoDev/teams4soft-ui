import type * as React from "react";
import { cn } from "../../../lib";
import { Button } from "../../../primitives";

export interface GridToolbarProps {
  children?: React.ReactNode;
  toggler?: React.ReactNode;
  addLabel?: string;
  onAdd?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  unstyled?: boolean;
}

/** Contenido de la página y controles de columnas en una sola barra. */
export function GridToolbar({ children, toggler, addLabel, onAdd, disabled, className, style, unstyled = false }: GridToolbarProps) {
  if (!children && !toggler && !onAdd) return null;
  return (
    <div data-slot="toolbar" className={cn(!unstyled && "flex flex-wrap items-center justify-between gap-2", className)} style={style}>
      {onAdd && <Button type="button" size="sm" unstyled={unstyled} disabled={disabled} onClick={onAdd}>{addLabel}</Button>}
      {children}
      {toggler}
    </div>
  );
}
