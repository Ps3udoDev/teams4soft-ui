import type * as React from "react";

/** Lados posibles de anclaje del content respecto al trigger. */
export type TooltipSide = "top" | "right" | "bottom" | "left";

/** Alineación del content respecto al eje del trigger. */
export type TooltipAlign = "start" | "center" | "end";

/** Slots personalizables vía `classNames`/`styles`. */
export interface TooltipClassNames {
  content: string;
  arrow: string;
}

export interface TooltipProps {
  /**
   * Único hijo interactivo que actúa como disparador. Se envuelve vía
   * Radix `Trigger asChild`: debe conservar su propio nombre accesible
   * (p. ej. `aria-label` en controles icon-only), porque el tooltip NO debe
   * ser el único nombre accesible del disparador.
   */
  children: React.ReactElement;
  /** Contenido breve del tooltip, normalmente una oración. */
  content: React.ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  /** Sobrescribe el `delayDuration` del `TooltipProvider` para esta instancia. */
  delayDuration?: number;
  /** Cuando es `true`, renderiza únicamente `children`: no monta el tooltip. */
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Personaliza el elemento raíz visible del tooltip (el `content`). */
  className?: string;
  classNames?: Partial<TooltipClassNames>;
  /** Conserva portal, collision detection y foco; omite clases visuales. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof TooltipClassNames, React.CSSProperties>>;
}
