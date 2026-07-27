import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "../../lib";
import type { CheckboxFieldProps, CheckedState } from "./CheckboxField.types";

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      focusable="false"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      focusable="false"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

const rootBaseClassName = "flex items-start gap-2";

const controlBaseClassName =
  "size-4 shrink-0 rounded-(--radius-ui-sm) border border-ui-border bg-ui-background data-[state=checked]:bg-ui-primary data-[state=checked]:border-ui-primary data-[state=indeterminate]:bg-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-ui-danger";

const indicatorBaseClassName =
  "flex items-center justify-center text-ui-primary-foreground";

const contentBaseClassName = "grid gap-1";

const labelBaseClassName = "text-sm font-medium text-ui-foreground";

const requiredIndicatorBaseClassName = "ml-1 text-ui-danger";

const descriptionBaseClassName = "text-sm text-ui-foreground/60";

const errorBaseClassName = "text-sm text-ui-danger";

/**
 * Control booleano/indeterminado con label, descripción y error, sobre
 * Radix `Checkbox`. Consulta `components_docs/migration/05_checkbox_field.md`
 * para el contrato completo.
 *
 * El estado (controlado vía `checked`/`onCheckedChange`, o no controlado vía
 * `defaultChecked`) se rastrea internamente para poder elegir el indicador
 * correcto (`indicator` vs `indeterminateIndicator`); Radix siempre recibe un
 * `checked` resuelto, y `onCheckedChange` reenvía el valor semántico tal cual
 * lo emite Radix (`boolean | "indeterminate"`, nunca convertido a string).
 */
export const CheckboxField = React.forwardRef<
  HTMLButtonElement,
  CheckboxFieldProps
>(
  (
    {
      id,
      name,
      checked,
      defaultChecked,
      onCheckedChange,
      value,
      label,
      description,
      errorMessage,
      required = false,
      disabled = false,
      invalid = false,
      indicator,
      indeterminateIndicator,
      className,
      classNames,
      unstyled = false,
      style,
      styles,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const controlId = id ?? generatedId;
    const labelId = `${controlId}-label`;
    const descriptionId = `${controlId}-description`;
    const errorId = `${controlId}-error`;

    const isControlled = checked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState<CheckedState>(defaultChecked ?? false);
    const currentChecked = isControlled
      ? (checked as CheckedState)
      : uncontrolledChecked;

    const handleCheckedChange = (next: CheckedState) => {
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    };

    const hasErrorContent = !isEmptyMessage(errorMessage);
    const hasDescriptionContent =
      !isEmptyMessage(description) && !hasErrorContent;
    const effectiveInvalid = invalid || hasErrorContent;

    const describedBy =
      [
        hasDescriptionContent ? descriptionId : null,
        hasErrorContent ? errorId : null,
      ]
        .filter((v): v is string => Boolean(v))
        .join(" ") || undefined;

    const isIndeterminate = currentChecked === "indeterminate";

    return (
      <div
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        data-invalid={effectiveInvalid || undefined}
        data-disabled={disabled || undefined}
        data-required={required || undefined}
      >
        <CheckboxPrimitive.Root
          ref={ref}
          id={controlId}
          name={name}
          value={value}
          required={required}
          disabled={disabled}
          checked={currentChecked}
          onCheckedChange={handleCheckedChange}
          aria-invalid={effectiveInvalid || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          data-invalid={effectiveInvalid || undefined}
          className={cn(
            !unstyled && controlBaseClassName,
            classNames?.control,
          )}
          style={styles?.control}
        >
          <CheckboxPrimitive.Indicator
            className={cn(
              !unstyled && indicatorBaseClassName,
              classNames?.indicator,
            )}
            style={styles?.indicator}
          >
            {isIndeterminate
              ? (indeterminateIndicator ?? <IconMinus />)
              : (indicator ?? <IconCheck />)}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <div
          className={cn(!unstyled && contentBaseClassName, classNames?.content)}
          style={styles?.content}
        >
          <label
            id={labelId}
            htmlFor={controlId}
            className={cn(!unstyled && labelBaseClassName, classNames?.label)}
            style={styles?.label}
            data-disabled={disabled || undefined}
          >
            {label}
            {required ? (
              <span
                className={cn(!unstyled && requiredIndicatorBaseClassName)}
              >
                <span aria-hidden="true">*</span>
                <span className="sr-only"> (requerido)</span>
              </span>
            ) : null}
          </label>
          {hasDescriptionContent ? (
            <p
              id={descriptionId}
              className={cn(
                !unstyled && descriptionBaseClassName,
                classNames?.description,
              )}
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
        </div>
      </div>
    );
  },
);

CheckboxField.displayName = "CheckboxField";
