import * as React from "react";
import { cn, devWarn } from "../../lib";
import type { SpinnerProps, SpinnerSize } from "./Spinner.types";

const sizeClassName: Record<SpinnerSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

const baseClassName = "inline-flex shrink-0 items-center justify-center";

const svgBaseClassName = "h-full w-full motion-safe:animate-spin";

/**
 * Indicador de actividad indeterminada. Usa `label` cuando comunique carga y
 * `decorative` cuando acompañe a un texto que ya la anuncia.
 */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  function Spinner(
    { size = "md", label, decorative = false, unstyled = false, className, ...rest },
    ref,
  ) {
    if (decorative && label !== undefined) {
      devWarn(
        "<Spinner> recibió `label` y `decorative` a la vez. `decorative` gana y el label se ignora.",
      );
    }

    return (
      <span
        ref={ref}
        role={decorative ? undefined : "status"}
        aria-label={!decorative && label !== undefined ? label : undefined}
        aria-hidden={decorative || undefined}
        data-size={size}
        className={cn(
          !unstyled && baseClassName,
          !unstyled && sizeClassName[size],
          className,
        )}
        {...rest}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={unstyled ? undefined : svgBaseClassName}
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
          />
        </svg>
      </span>
    );
  },
);

Spinner.displayName = "Spinner";
