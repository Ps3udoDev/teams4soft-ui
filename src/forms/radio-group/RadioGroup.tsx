import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../../lib";
import type { RadioGroupProps, RadioOption } from "./RadioGroup.types";

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

const rootBaseClassName = "grid gap-1.5";

const labelBaseClassName = "text-sm font-medium text-ui-foreground";

const requiredIndicatorBaseClassName = "ml-1 text-ui-danger";

const descriptionBaseClassName = "text-sm text-ui-foreground/60";

const errorBaseClassName = "text-sm text-ui-danger";

const optionsOrientationClassName: Record<"horizontal" | "vertical", string> = {
  vertical: "flex flex-col gap-2",
  horizontal: "flex flex-row flex-wrap gap-4",
};

const optionBaseClassName = "flex items-start gap-2";

const controlBaseClassName =
  "size-4 shrink-0 rounded-full border border-ui-border bg-ui-background data-[state=checked]:border-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-50 data-[invalid]:border-ui-danger";

const indicatorBaseClassName =
  "flex items-center justify-center after:size-2 after:rounded-full after:bg-ui-primary";

const optionContentBaseClassName = "grid gap-1";

const optionLabelBaseClassName = "text-sm font-medium text-ui-foreground";

const optionDescriptionBaseClassName = "text-sm text-ui-foreground/60";

/**
 * Selección única de un conjunto, sobre Radix `RadioGroup`. Consulta
 * `components_docs/migration/06_radio_group.md` para el contrato completo.
 *
 * Genérico en `TValue extends string`: `options[].value` determina el tipo,
 * y `onValueChange` reenvía el `string` que emite Radix casteado a
 * `TValue` (siempre proviene de un `value` de `options`, nunca de entrada
 * arbitraria). No usa `forwardRef`: Radix gestiona el foco entre opciones
 * vía roving tabindex, así que no hay un único nodo raíz al que exponer una
 * ref de forma útil (ver nota del spec/brief).
 */
export function RadioGroup<TValue extends string>({
  name,
  label,
  description,
  value,
  defaultValue,
  onValueChange,
  options,
  orientation = "vertical",
  required = false,
  disabled = false,
  invalid = false,
  errorMessage,
  renderOption,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: RadioGroupProps<TValue>): React.ReactElement {
  const generatedId = React.useId();
  const labelId = `${generatedId}-label`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const hasErrorContent = !isEmptyMessage(errorMessage);
  const hasDescriptionContent = !isEmptyMessage(description) && !hasErrorContent;
  const effectiveInvalid = invalid || hasErrorContent;

  const describedBy =
    [
      hasDescriptionContent ? descriptionId : null,
      hasErrorContent ? errorId : null,
    ]
      .filter((v): v is string => Boolean(v))
      .join(" ") || undefined;

  const handleValueChange = (next: string) => {
    onValueChange?.(next as TValue);
  };

  return (
    <RadioGroupPrimitive.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      orientation={orientation}
      required={required}
      disabled={disabled}
      aria-labelledby={label !== undefined && label !== null ? labelId : undefined}
      aria-describedby={describedBy}
      aria-invalid={effectiveInvalid || undefined}
      aria-required={required || undefined}
      data-invalid={effectiveInvalid || undefined}
      data-disabled={disabled || undefined}
      data-required={required || undefined}
      className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
      style={{ ...styles?.root, ...style }}
    >
      {label !== undefined && label !== null ? (
        <span
          id={labelId}
          className={cn(!unstyled && labelBaseClassName, classNames?.label)}
          style={styles?.label}
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
        </span>
      ) : null}
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
      <div
        className={cn(
          !unstyled && optionsOrientationClassName[orientation],
          classNames?.options,
        )}
        style={styles?.options}
      >
        {options.map((option) => {
          const optionDisabled = disabled || Boolean(option.disabled);
          // Best-effort: solo refleja `value`/`defaultValue` en el momento del
          // render inicial. No rastrea el estado interno de Radix tras
          // interacciones en modo no controlado (ver JSDoc de `renderOption`).
          const bestEffortValue = value ?? defaultValue;
          const checked =
            bestEffortValue !== undefined
              ? bestEffortValue === option.value
              : false;
          const hasOptionDescriptionContent = !isEmptyMessage(option.description);
          const optionLabelId = `${generatedId}-option-${option.value}-label`;
          const optionDescriptionId = `${generatedId}-option-${option.value}-description`;

          return (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              disabled={optionDisabled}
              aria-labelledby={renderOption ? undefined : optionLabelId}
              aria-describedby={
                !renderOption && hasOptionDescriptionContent
                  ? optionDescriptionId
                  : undefined
              }
              className={cn(!unstyled && optionBaseClassName, classNames?.option)}
              style={styles?.option}
            >
              {renderOption ? (
                renderOption(option, {
                  checked,
                  disabled: optionDisabled,
                })
              ) : (
                <>
                  <span
                    className={cn(!unstyled && controlBaseClassName, classNames?.control)}
                    style={styles?.control}
                    data-state={checked ? "checked" : "unchecked"}
                    data-invalid={effectiveInvalid || undefined}
                  >
                    <RadioGroupPrimitive.Indicator
                      className={cn(
                        !unstyled && indicatorBaseClassName,
                        classNames?.indicator,
                      )}
                      style={styles?.indicator}
                    />
                  </span>
                  <span
                    className={cn(
                      !unstyled && optionContentBaseClassName,
                      classNames?.optionContent,
                    )}
                    style={styles?.optionContent}
                  >
                    <span
                      id={optionLabelId}
                      className={cn(
                        !unstyled && optionLabelBaseClassName,
                        classNames?.optionLabel,
                      )}
                      style={styles?.optionLabel}
                    >
                      {option.label}
                    </span>
                    {hasOptionDescriptionContent ? (
                      <span
                        id={optionDescriptionId}
                        className={cn(
                          !unstyled && optionDescriptionBaseClassName,
                          classNames?.optionDescription,
                        )}
                        style={styles?.optionDescription}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </>
              )}
            </RadioGroupPrimitive.Item>
          );
        })}
      </div>
      {hasErrorContent ? (
        <p
          id={errorId}
          className={cn(!unstyled && errorBaseClassName, classNames?.error)}
          style={styles?.error}
        >
          {errorMessage}
        </p>
      ) : null}
    </RadioGroupPrimitive.Root>
  );
}

RadioGroup.displayName = "RadioGroup";

export type { RadioOption };
