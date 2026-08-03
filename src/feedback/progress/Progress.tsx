import * as React from "react";
import { cn, devWarn } from "../../lib";
import type {
  ProgressProps,
  ProgressSize,
  ProgressTone,
} from "./Progress.types";

const toneClassName: Record<ProgressTone, string> = {
  primary: "bg-ui-primary",
  success: "bg-ui-primary",
  warning: "bg-ui-danger",
  danger: "bg-ui-danger",
};

const sizeClassName: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const rootBaseClassName = "grid w-full gap-1.5";
const headerBaseClassName = "flex items-center justify-between gap-2";
const labelBaseClassName = "text-sm text-ui-foreground";
const valueBaseClassName = "text-sm tabular-nums text-ui-foreground/60";
const trackBaseClassName =
  "w-full overflow-hidden rounded-full bg-ui-muted";
const indicatorBaseClassName =
  "h-full rounded-full motion-safe:transition-[width] motion-reduce:transition-none";
const indeterminateIndicatorClassName =
  "w-1/3 motion-safe:animate-pulse";

/**
 * Barra de progreso. Sin `value` representa progreso indeterminado y, tal como
 * exige ARIA, omite `aria-valuenow` en lugar de fingir un cero.
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(
    {
      value,
      max = 100,
      label,
      showValue = false,
      tone = "primary",
      size = "md",
      className,
      classNames,
      unstyled = false,
      style,
      styles,
    },
    ref,
  ) {
    const safeMax = max > 0 ? max : 0;
    if (max <= 0) {
      devWarn(
        "<Progress> recibió un `max` no positivo. Usa `max` > 0.",
      );
    }

    const isIndeterminate = value === undefined;
    const clamped = isIndeterminate
      ? undefined
      : Math.min(Math.max(value, 0), safeMax);
    const percent =
      clamped === undefined || safeMax <= 0 ? 0 : Math.round((clamped / safeMax) * 100);

    const generatedId = React.useId();
    const labelId = `${generatedId}-label`;

    const hasLabel = label !== undefined && label !== null && label !== "";
    const showPercent = showValue && !isIndeterminate;

    return (
      <div
        ref={ref}
        role="progressbar"
        // `aria-labelledby` en vez de `aria-label`: así funciona igual cuando
        // `label` es un ReactNode y no una cadena.
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        data-tone={tone}
        data-size={size}
        data-indeterminate={isIndeterminate || undefined}
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
      >
        {hasLabel || showPercent ? (
          <div className={unstyled ? undefined : headerBaseClassName}>
            {hasLabel ? (
              <span
                id={labelId}
                className={cn(!unstyled && labelBaseClassName, classNames?.label)}
                style={styles?.label}
              >
                {label}
              </span>
            ) : (
              <span />
            )}
            {showPercent ? (
              <span
                className={cn(!unstyled && valueBaseClassName, classNames?.value)}
                style={styles?.value}
              >
                {percent}%
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            !unstyled && trackBaseClassName,
            !unstyled && sizeClassName[size],
            classNames?.track,
          )}
          style={styles?.track}
        >
          <div
            className={cn(
              !unstyled && indicatorBaseClassName,
              !unstyled && toneClassName[tone],
              !unstyled && isIndeterminate && indeterminateIndicatorClassName,
              classNames?.indicator,
            )}
            style={{
              ...(isIndeterminate ? undefined : { width: `${percent}%` }),
              ...styles?.indicator,
            }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = "Progress";
