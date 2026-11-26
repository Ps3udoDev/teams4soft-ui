import * as React from "react";
import { cn } from "../../lib";
import { FormField } from "../form-field/FormField";
import { useFormFieldContext } from "../form-field/FormField.context";
import type { TextareaFieldProps } from "./TextareaField.types";

const textareaBaseClassName =
  "w-full min-w-0 rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-3 py-2 text-sm text-ui-foreground outline-none transition-colors placeholder:text-ui-foreground/40 focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-background disabled:cursor-not-allowed disabled:opacity-50 data-[invalid=true]:border-ui-danger";

function mergeTokenLists(...lists: Array<string | undefined>): string | undefined {
  const tokens = lists
    .flatMap((list) => (list ? list.split(" ") : []))
    .map((t) => t.trim())
    .filter(Boolean);
  const deduped = Array.from(new Set(tokens));
  return deduped.length > 0 ? deduped.join(" ") : undefined;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      description,
      errorMessage,
      value,
      defaultValue,
      onValueChange,
      onChange,
      invalid = false,
      required,
      disabled,
      rows = 3,
      id,
      className,
      classNames,
      style,
      styles,
      unstyled = false,
      "aria-invalid": ariaInvalidProp,
      "aria-required": ariaRequiredProp,
      "aria-describedby": ariaDescribedByProp,
      ...rest
    },
    ref,
  ) => {
    const formCtx = useFormFieldContext();
    const generatedId = React.useId();
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
    const currentValue = isControlled ? value : internalValue;

    const hasStandaloneField = !formCtx && (label !== undefined || description !== undefined || errorMessage !== undefined);
    const resolvedId = id ?? formCtx?.id ?? generatedId;
    const resolvedDisabled = disabled !== undefined ? disabled : (formCtx?.disabled ?? false);
    const resolvedInvalid = invalid || Boolean(formCtx?.invalid) || Boolean(errorMessage);

    const generatedDescribedBy = formCtx
      ? [
          formCtx.hasDescription ? formCtx.descriptionId : null,
          formCtx.hasError ? formCtx.errorId : null,
        ]
          .filter((v): v is string => Boolean(v))
          .join(" ")
      : "";
    const resolvedAriaDescribedBy = mergeTokenLists(
      ariaDescribedByProp,
      generatedDescribedBy.length > 0 ? generatedDescribedBy : undefined,
    );

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
      onChange?.(event);
    };

    const textarea = (
      <textarea
        ref={ref}
        id={resolvedId}
        rows={rows}
        value={currentValue}
        onChange={handleChange}
        disabled={resolvedDisabled}
        required={required ?? formCtx?.required}
        aria-invalid={ariaInvalidProp !== undefined ? ariaInvalidProp : resolvedInvalid ? true : undefined}
        aria-required={ariaRequiredProp !== undefined ? ariaRequiredProp : (required ?? formCtx?.required) ? true : undefined}
        aria-describedby={resolvedAriaDescribedBy}
        data-invalid={resolvedInvalid || undefined}
        data-disabled={resolvedDisabled || undefined}
        className={cn(!unstyled && textareaBaseClassName, className, classNames?.textarea)}
        style={{ ...styles?.textarea, ...style }}
        {...rest}
      />
    );

    if (!hasStandaloneField) return textarea;

    return (
      <FormField.Root
        id={resolvedId}
        required={required}
        invalid={resolvedInvalid}
        disabled={resolvedDisabled}
        unstyled={unstyled}
        className={classNames?.root}
        style={styles?.root}
      >
        {label !== undefined && label !== null ? <FormField.Label>{label}</FormField.Label> : null}
        <FormField.Control>{textarea}</FormField.Control>
        {description ? <FormField.Description>{description}</FormField.Description> : null}
        {errorMessage ? <FormField.Error>{errorMessage}</FormField.Error> : null}
      </FormField.Root>
    );
  },
);

TextareaField.displayName = "TextareaField";
