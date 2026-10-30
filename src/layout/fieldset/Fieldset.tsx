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
const FieldsetImpl = React.forwardRef<HTMLElement, FieldsetProps>(
  (
    {
      legend,
      description,
      errorMessage,
      invalid = false,
      required = false,
      orientation = "vertical",
      variant = "outlined",
      as = "fieldset",
      disabled,
      form,
      name,
      className,
      classNames,
      unstyled = false,
      style,
      styles,
      children,
      "aria-describedby": ariaDescribedByProp,
      "aria-labelledby": ariaLabelledByProp,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const descriptionId = `${generatedId}-description`;
    const errorId = `${generatedId}-error`;
    const legendId = `${generatedId}-legend`;
    const Root = as;
    const Legend = as === "section" ? "h3" : "legend";

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
      <Root
        ref={ref as React.Ref<HTMLFieldSetElement>}
        className={cn(!unstyled && variant === "outlined" && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        aria-describedby={describedBy}
        aria-labelledby={as === "section" ? [legendId, ariaLabelledByProp].filter(Boolean).join(" ") : ariaLabelledByProp}
        disabled={as === "fieldset" ? disabled : undefined}
        form={as === "fieldset" ? form : undefined}
        name={as === "fieldset" ? name : undefined}
        data-variant={variant}
        data-invalid={effectiveInvalid || undefined}
        data-required={required || undefined}
        data-orientation={orientation || undefined}
        {...rest}
      >
        <Legend
          id={as === "section" ? legendId : undefined}
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
        </Legend>
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
      </Root>
    );
  },
);

/** Keep the native fieldset ref precise while exposing section's HTMLElement ref. */
export const Fieldset = FieldsetImpl as {
  (props: FieldsetProps & { as: "section" } & React.RefAttributes<HTMLElement>): React.ReactElement | null;
  (props: FieldsetProps & React.RefAttributes<HTMLFieldSetElement>): React.ReactElement | null;
  displayName?: string;
};
Fieldset.displayName = "Fieldset";
