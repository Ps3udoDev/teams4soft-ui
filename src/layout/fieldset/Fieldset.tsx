import * as React from "react";
import { cn } from "../../lib";
import type { FieldsetProps } from "./Fieldset.types";

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

const rootBaseClassName = "border border-ui-border rounded-(--radius-ui-md) p-4";

const legendBaseClassName = "px-1 text-sm font-medium text-ui-foreground";

const requiredIndicatorBaseClassName = "ml-1 text-ui-danger";

const descriptionBaseClassName = "mb-2 text-sm text-ui-foreground/60";

const errorBaseClassName = "mb-2 text-sm text-ui-danger";

const contentOrientationClassName: Record<"vertical" | "horizontal", string> = {
  vertical: "grid gap-4",
  horizontal: "flex flex-row gap-4",
};

/**
 * Agrupación semántica nativa de controles relacionados, sobre `<fieldset>`/
 * `<legend>`. Consulta `components_docs/migration/07_fieldset.md` para el
 * contrato completo.
 *
 * `disabled` es el `disabled` nativo del elemento `<fieldset>`: deshabilita
 * automáticamente todos los controles descendientes, sin lógica manual.
 */
export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(
  (
    {
      legend,
      description,
      errorMessage,
      invalid = false,
      required = false,
      orientation = "vertical",
      className,
      classNames,
      unstyled = false,
      style,
      styles,
      children,
      "aria-describedby": ariaDescribedByProp,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const descriptionId = `${generatedId}-description`;
    const errorId = `${generatedId}-error`;

    const hasErrorContent = !isEmptyMessage(errorMessage);
    const hasDescriptionContent = !isEmptyMessage(description) && !hasErrorContent;
    const effectiveInvalid = invalid || hasErrorContent;

    const generatedDescribedBy = [
      hasDescriptionContent ? descriptionId : null,
      hasErrorContent ? errorId : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ");

    const describedBy =
      [ariaDescribedByProp, generatedDescribedBy.length > 0 ? generatedDescribedBy : null]
        .filter((value): value is string => Boolean(value))
        .join(" ") || undefined;

    return (
      <fieldset
        ref={ref}
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        aria-describedby={describedBy}
        data-invalid={effectiveInvalid || undefined}
        data-required={required || undefined}
        data-orientation={orientation || undefined}
        {...rest}
      >
        <legend
          className={cn(!unstyled && legendBaseClassName, classNames?.legend)}
          style={styles?.legend}
        >
          {legend}
          {required ? (
            <span className={cn(!unstyled && requiredIndicatorBaseClassName)}>
              <span aria-hidden="true">*</span>
              <span className="sr-only"> (requerido)</span>
            </span>
          ) : null}
        </legend>
        {hasDescriptionContent ? (
          <p
            id={descriptionId}
            className={cn(!unstyled && descriptionBaseClassName, classNames?.description)}
            style={styles?.description}
          >
            {description}
          </p>
        ) : null}
        {hasErrorContent ? (
          <p
            id={errorId}
            className={cn(!unstyled && errorBaseClassName, classNames?.error)}
            style={styles?.error}
          >
            {errorMessage}
          </p>
        ) : null}
        <div
          className={cn(
            !unstyled && contentOrientationClassName[orientation],
            classNames?.content,
          )}
          style={styles?.content}
        >
          {children}
        </div>
      </fieldset>
    );
  },
);

Fieldset.displayName = "Fieldset";
