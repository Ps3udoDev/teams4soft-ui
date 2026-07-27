import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib";
import type { TooltipProps } from "./Tooltip.types";

/**
 * Re-export directo del `Provider` de Radix: ya admite `delayDuration` con
 * valor por defecto (700ms) y lo comparte entre todas las instancias de
 * `Tooltip` que anide. Un solo `TooltipProvider` puede definir el delay
 * global de la aplicación.
 */
export const TooltipProvider = TooltipPrimitive.Provider;

const contentBaseClassName =
  "z-50 max-w-xs text-balance rounded-(--radius-ui-sm) bg-ui-foreground px-3 py-1.5 text-sm text-ui-background shadow-md transition-[opacity,transform] duration-150 data-[state=closed]:opacity-0 data-[state=delayed-open]:opacity-100 data-[state=instant-open]:opacity-100 motion-reduce:transition-none motion-reduce:duration-0";

const arrowBaseClassName = "fill-ui-foreground";

/**
 * Wrapper de conveniencia sobre `@radix-ui/react-tooltip`: compone
 * `Root` + `Trigger asChild` + `Portal` + `Content` + `Arrow`. Consulta
 * `components_docs/migration/02_tooltip.md` para el contrato completo.
 *
 * Importante: el tooltip NUNCA debe ser el único nombre accesible del
 * disparador — `children` debe conservar su propio `aria-label` (o texto)
 * cuando sea un control icon-only.
 */
export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 4,
  delayDuration,
  disabled = false,
  open,
  defaultOpen,
  onOpenChange,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: TooltipProps): React.ReactElement {
  if (disabled) {
    // Solo se renderiza el disparador: sin Root/Trigger/Content no hay
    // tooltip que montar, pero el hijo (y su aria-label) se preserva tal cual.
    return children;
  }

  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            !unstyled && contentBaseClassName,
            className,
            classNames?.content,
          )}
          style={{ ...styles?.content, ...style }}
        >
          {content}
          <TooltipPrimitive.Arrow
            className={cn(!unstyled && arrowBaseClassName, classNames?.arrow)}
            style={styles?.arrow}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

Tooltip.displayName = "Tooltip";
