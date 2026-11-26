import * as React from "react";
import { cn, mergeRefs } from "../../lib";
import { Button } from "../../primitives";
import { FormField } from "../form-field/FormField";
import { useFormFieldContext } from "../form-field/FormField.context";
import type { FilePickerFieldProps } from "./FilePickerField.types";

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept || !accept.trim()) return true;
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const fileName = file.name.toLowerCase();
  const fileType = (file.type || "").toLowerCase();
  return tokens.some((token) => {
    if (token === "*" || token === "*/*") return true;
    if (token.startsWith(".")) return fileName.endsWith(token);
    if (token.endsWith("/*")) return fileType.startsWith(token.slice(0, -1));
    return fileType === token;
  });
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

const controlBaseClassName =
  "flex w-full flex-wrap items-center gap-2 rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-3 py-2 text-sm text-ui-foreground data-[invalid=true]:border-ui-danger data-[disabled=true]:opacity-50";

export const FilePickerField = React.forwardRef<HTMLInputElement, FilePickerFieldProps>(
  (
    {
      id,
      name,
      label,
      description,
      errorMessage,
      value,
      defaultValue = null,
      onValueChange,
      onReject,
      accept,
      maxSizeBytes,
      disabled,
      required,
      invalid = false,
      placeholder = "Ningún archivo seleccionado",
      selectLabel = "Seleccionar archivo",
      clearLabel = "Limpiar",
      className,
      classNames,
      style,
      styles,
      unstyled = false,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
    },
    ref,
  ) => {
    const formCtx = useFormFieldContext();
    const generatedId = React.useId();
    const inputId = id ?? formCtx?.id ?? generatedId;
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const mergedRef = React.useMemo(() => mergeRefs(ref, inputRef), [ref]);

    const isControlled = value !== undefined;
    const [internalFile, setInternalFile] = React.useState<File | null>(defaultValue);
    const currentFile = isControlled ? value : internalFile;
    const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(null);

    const resolvedDisabled = disabled !== undefined ? disabled : (formCtx?.disabled ?? false);
    const effectiveError = errorMessage ?? rejectionMessage ?? undefined;
    const resolvedInvalid = invalid || Boolean(formCtx?.invalid) || Boolean(effectiveError);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = event.target.files?.[0];
      // Resetear el value nativo permite volver a elegir el mismo archivo.
      event.target.value = "";
      if (!picked) {
        // Cancelar conserva el archivo confirmado previamente.
        return;
      }
      if (!matchesAccept(picked, accept)) {
        setRejectionMessage(`Tipo de archivo no permitido (${picked.name}).`);
        onReject?.("type", picked);
        return;
      }
      if (maxSizeBytes !== undefined && picked.size > maxSizeBytes) {
        setRejectionMessage(`El archivo supera el tamaño máximo de ${formatSize(maxSizeBytes)}.`);
        onReject?.("size", picked);
        return;
      }
      setRejectionMessage(null);
      if (!isControlled) setInternalFile(picked);
      onValueChange?.(picked);
    };

    const handleClear = () => {
      if (inputRef.current) inputRef.current.value = "";
      setRejectionMessage(null);
      if (!isControlled) setInternalFile(null);
      onValueChange?.(null);
      triggerRef.current?.focus();
    };

    const control = (
      <div
        data-slot="control"
        data-invalid={resolvedInvalid || undefined}
        data-disabled={resolvedDisabled || undefined}
        className={cn(!unstyled && controlBaseClassName, className, classNames?.control)}
        style={{ ...styles?.control, ...style }}
      >
        <input
          ref={mergedRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          disabled={resolvedDisabled}
          required={required ?? formCtx?.required}
          aria-label={ariaLabel}
          aria-invalid={resolvedInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          onChange={handleChange}
          className="sr-only"
        />
        <Button
          ref={triggerRef}
          type="button"
          size="sm"
          variant="outline"
          disabled={resolvedDisabled}
          onClick={() => inputRef.current?.click()}
          className={classNames?.trigger}
          style={styles?.trigger}
        >
          {selectLabel}
        </Button>
        <span
          data-slot="file-name"
          className={cn(
            !unstyled && "min-w-0 flex-1 truncate text-sm",
            !unstyled && !currentFile && "text-ui-foreground/60",
            classNames?.fileName,
          )}
          style={styles?.fileName}
        >
          {currentFile ? currentFile.name : placeholder}
        </span>
        {currentFile && !resolvedDisabled ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={clearLabel}
            onClick={handleClear}
            className={classNames?.clearButton}
            style={styles?.clearButton}
          >
            {clearLabel}
          </Button>
        ) : null}
      </div>
    );

    if (formCtx) {
      return (
        <>
          {control}
          {rejectionMessage && !errorMessage ? (
            <p role="alert" className={cn(!unstyled && "mt-1 text-sm text-ui-danger")}>
              {rejectionMessage}
            </p>
          ) : null}
        </>
      );
    }

    return (
      <FormField.Root
        id={inputId}
        required={required}
        invalid={resolvedInvalid}
        disabled={resolvedDisabled}
        unstyled={unstyled}
        className={classNames?.root}
        style={styles?.root}
      >
        {label !== undefined && label !== null ? <FormField.Label>{label}</FormField.Label> : null}
        {control}
        {description ? <FormField.Description>{description}</FormField.Description> : null}
        {effectiveError ? <FormField.Error role="alert">{effectiveError}</FormField.Error> : null}
      </FormField.Root>
    );
  },
);

FilePickerField.displayName = "FilePickerField";
