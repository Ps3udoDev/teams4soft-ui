import * as React from "react";
import { cn, mergeRefs } from "../../lib";
import { useFormFieldContext } from "../form-field/FormField.context";
import type { TextFieldProps, TextFieldSize } from "./TextField.types";

/** Spinner mínimo, sin dependencias externas. Hereda `currentColor`. */
function TextFieldSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
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
  );
}

function IconEye() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 1 12s4 8 11 8a10.94 10.94 0 0 0 5.39-1.61M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const rootBaseClassName =
  "inline-flex w-full items-center gap-2 rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-3 text-ui-foreground transition-colors focus-within:ring-2 focus-within:ring-ui-focus focus-within:ring-offset-2 focus-within:ring-offset-ui-background data-[invalid=true]:border-ui-danger data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50";

const rootSizeClassName: Record<TextFieldSize, string> = {
  sm: "h-8 text-sm",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
};

const inputBaseClassName =
  "peer w-full min-w-0 bg-transparent text-inherit outline-none placeholder:text-ui-foreground/40 disabled:cursor-not-allowed";

const auxButtonBaseClassName =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-ui-sm) text-ui-foreground/60 outline-none transition-colors hover:bg-ui-muted hover:text-ui-foreground focus-visible:ring-2 focus-visible:ring-ui-focus disabled:pointer-events-none disabled:opacity-50";

const slotBaseClassName = "flex shrink-0 items-center text-ui-foreground/60";

/**
 * Campo de texto accesible y controlable, compuesto con `FormField`.
 * Consulta `components_docs/migration/04_text_field.md` para el contrato
 * completo.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      size = "md",
      leading,
      trailing,
      clearable = false,
      onClear,
      revealPassword = false,
      invalid = false,
      loading = false,
      className,
      classNames,
      unstyled = false,
      style,
      styles,
      type,
      id,
      disabled,
      readOnly,
      "aria-invalid": ariaInvalidProp,
      "aria-required": ariaRequiredProp,
      "aria-describedby": ariaDescribedByProp,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const formCtx = useFormFieldContext();

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = React.useMemo(
      () => mergeRefs(ref, inputRef),
      [ref],
    );

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      defaultValue ?? "",
    );
    const currentValue = isControlled ? (value ?? "") : internalValue;

    const [passwordVisible, setPasswordVisible] = React.useState(false);
    const pendingSelectionRef = React.useRef<{
      start: number | null;
      end: number | null;
    } | null>(null);

    React.useEffect(() => {
      const pending = pendingSelectionRef.current;
      if (!pending) return;
      pendingSelectionRef.current = null;
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      try {
        node.setSelectionRange(pending.start ?? 0, pending.end ?? 0);
      } catch {
        // Algunos tipos de input no soportan selección: se ignora.
      }
    }, [passwordVisible]);

    const isPasswordField = type === "password";
    const effectiveType =
      isPasswordField && revealPassword && passwordVisible ? "text" : type;

    const resolvedId = id ?? formCtx?.id ?? generatedId;
    const resolvedDisabled =
      disabled !== undefined ? disabled : (formCtx?.disabled ?? false);
    const resolvedInvalid = invalid || Boolean(formCtx?.invalid);

    const resolvedAriaInvalid =
      ariaInvalidProp !== undefined
        ? ariaInvalidProp
        : resolvedInvalid
          ? true
          : undefined;

    const resolvedAriaRequired =
      ariaRequiredProp !== undefined
        ? ariaRequiredProp
        : formCtx?.required
          ? true
          : undefined;

    const generatedDescribedBy = formCtx
      ? [
          formCtx.hasDescription ? formCtx.descriptionId : null,
          formCtx.hasError ? formCtx.errorId : null,
        ]
          .filter((v): v is string => Boolean(v))
          .join(" ")
      : "";
    const resolvedAriaDescribedBy =
      ariaDescribedByProp !== undefined
        ? ariaDescribedByProp
        : generatedDescribedBy.length > 0
          ? generatedDescribedBy
          : undefined;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      if (!isControlled) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue("");
      }
      onValueChange?.("");
      onClear?.();
      inputRef.current?.focus();
    };

    const handleTogglePassword = () => {
      const node = inputRef.current;
      pendingSelectionRef.current = node
        ? { start: node.selectionStart, end: node.selectionEnd }
        : null;
      setPasswordVisible((visible) => !visible);
    };

    const showClear =
      clearable && currentValue.length > 0 && !resolvedDisabled && !readOnly;
    const showPasswordToggle = isPasswordField && revealPassword;
    const hasLeading = Boolean(leading);
    const hasTrailing = Boolean(
      trailing || loading || showClear || showPasswordToggle,
    );

    const rootClassName = unstyled
      ? cn(className, classNames?.root)
      : cn(
          rootBaseClassName,
          rootSizeClassName[size],
          className,
          classNames?.root,
        );

    return (
      <div
        className={rootClassName}
        style={{ ...styles?.root, ...style }}
        data-size={size}
        data-invalid={resolvedInvalid || undefined}
        data-disabled={resolvedDisabled || undefined}
        data-readonly={readOnly || undefined}
        data-loading={loading || undefined}
        data-has-leading={hasLeading || undefined}
        data-has-trailing={hasTrailing || undefined}
      >
        {hasLeading ? (
          <span
            className={cn(!unstyled && slotBaseClassName, classNames?.leading)}
            style={styles?.leading}
            aria-hidden="true"
          >
            {leading}
          </span>
        ) : null}
        <input
          ref={mergedRef}
          id={resolvedId}
          type={effectiveType}
          value={currentValue}
          onChange={handleChange}
          disabled={resolvedDisabled}
          readOnly={readOnly}
          aria-invalid={resolvedAriaInvalid}
          aria-required={resolvedAriaRequired}
          aria-describedby={resolvedAriaDescribedBy}
          data-size={size}
          data-invalid={resolvedInvalid || undefined}
          data-disabled={resolvedDisabled || undefined}
          data-readonly={readOnly || undefined}
          data-loading={loading || undefined}
          className={cn(!unstyled && inputBaseClassName, classNames?.input)}
          style={styles?.input}
          {...rest}
        />
        {loading ? (
          <span
            className={cn(!unstyled && slotBaseClassName, classNames?.trailing)}
            style={styles?.trailing}
            aria-hidden="true"
          >
            <TextFieldSpinner />
          </span>
        ) : null}
        {!loading && showClear ? (
          <button
            type="button"
            className={cn(!unstyled && auxButtonBaseClassName, classNames?.clearButton)}
            style={styles?.clearButton}
            aria-label="Limpiar"
            onClick={handleClear}
          >
            <IconX />
          </button>
        ) : null}
        {!loading && showPasswordToggle ? (
          <button
            type="button"
            className={cn(!unstyled && auxButtonBaseClassName, classNames?.passwordToggle)}
            style={styles?.passwordToggle}
            aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={passwordVisible}
            disabled={resolvedDisabled}
            onClick={handleTogglePassword}
          >
            {passwordVisible ? <IconEyeOff /> : <IconEye />}
          </button>
        ) : null}
        {!loading && !showClear && !showPasswordToggle && trailing ? (
          <span
            className={cn(!unstyled && slotBaseClassName, classNames?.trailing)}
            style={styles?.trailing}
            aria-hidden="true"
          >
            {trailing}
          </span>
        ) : null}
      </div>
    );
  },
);

TextField.displayName = "TextField";
