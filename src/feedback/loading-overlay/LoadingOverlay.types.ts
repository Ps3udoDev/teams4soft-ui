import type * as React from "react";

export interface LoadingOverlayClassNames {
  root: string;
  backdrop: string;
  panel: string;
  spinner: string;
  message: string;
}

export interface LoadingOverlayProps {
  open: boolean;
  message?: React.ReactNode;
  /**
   * Captura el puntero sobre el área cubierta y marca `aria-busy`.
   *
   * No inertiza el fondo: un componente renderizado dentro del contenedor no
   * puede aplicar `inert` a sus hermanos, así que el teclado puede seguir
   * tabulando por detrás. Deshabilita los controles del área afectada. Si tu
   * caso exige bloqueo real de la interacción, ese caso es un diálogo modal.
   */
  blocking?: boolean;
  /** `"container"` (default) exige que el padre esté posicionado (`relative`). */
  target?: "viewport" | "container";
  className?: string;
  classNames?: Partial<LoadingOverlayClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof LoadingOverlayClassNames, React.CSSProperties>>;
}
