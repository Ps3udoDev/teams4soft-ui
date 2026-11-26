import * as React from "react";
import { cn } from "../../lib";
import type { DividerProps } from "./Divider.types";

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = "horizontal", decorative = false, unstyled = false, className, ...rest }, ref) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      aria-hidden={decorative ? true : undefined}
      data-slot="root"
      data-orientation={orientation}
      className={cn(
        !unstyled && "shrink-0 bg-ui-border",
        !unstyled && (orientation === "horizontal" ? "h-px w-full" : "h-full min-h-4 w-px"),
        className,
      )}
      {...rest}
    />
  ),
);

Divider.displayName = "Divider";
