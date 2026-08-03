import * as React from "react";
import { cn } from "../../lib";
import type {
  SkeletonAnimation,
  SkeletonProps,
  SkeletonShape,
} from "./Skeleton.types";

const shapeClassName: Record<SkeletonShape, string> = {
  text: "h-4 w-full rounded-(--radius-ui-sm)",
  rect: "rounded-(--radius-ui-md)",
  circle: "rounded-full",
};

const animationClassName: Record<SkeletonAnimation, string> = {
  pulse: "motion-safe:animate-pulse",
  // `wave` se degrada a `pulse` mientras no exista un keyframe propio en el
  // tema: es preferible a no animar nada y a inventar una utilidad ausente.
  wave: "motion-safe:animate-pulse",
  none: "",
};

const baseClassName = "bg-ui-muted";

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Marcador de posición del contenido que aún no llegó. Es puramente
 * decorativo: quien anuncia la carga es el contenedor, con `aria-busy`.
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    {
      shape = "text",
      width,
      height,
      lines = 1,
      animation = "pulse",
      unstyled = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const isMultiline = shape === "text" && lines > 1;

    const resolvedStyle: React.CSSProperties = {
      width: toCssSize(width),
      height: toCssSize(height),
      ...style,
    };

    if (isMultiline) {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          data-shape={shape}
          data-animation={animation}
          className={cn(!unstyled && "flex flex-col gap-2", className)}
          style={resolvedStyle}
          {...rest}
        >
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              data-skeleton-line=""
              className={cn(
                !unstyled && baseClassName,
                !unstyled && shapeClassName.text,
                !unstyled && animationClassName[animation],
                // La última línea corta al 60% para imitar un párrafo real.
                !unstyled && index === lines - 1 && "w-3/5",
              )}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-shape={shape}
        data-animation={animation}
        {...(shape === "text" ? { "data-skeleton-line": "" } : {})}
        className={cn(
          !unstyled && baseClassName,
          !unstyled && shapeClassName[shape],
          !unstyled && animationClassName[animation],
          className,
        )}
        style={resolvedStyle}
        {...rest}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";
