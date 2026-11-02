import * as React from "react";
import { CheckboxField, DateField, NumberField, RadioGroup, SearchableSelectField, TextField } from "../../../forms";
import { cn, composeEventHandlers } from "../../../lib";
import type { DataGridColumn, DataGridColumnType } from "../DataGrid.types";

export interface EditCellProps<T> {
  rowId: string;
  column: DataGridColumn<T>;
  /** Último valor confirmado. */
  value: unknown;
  /** Borrador de la celda; solo lo usan los editores sin texto interno propio. */
  draft: unknown;
  onDraftChange: (draft: unknown) => void;
  onCommit: (value: unknown) => void;
  /** Los editores con popover avisan de su apertura: con uno abierto, Escape solo lo cierra. */
  onPopoverOpenChange?: (open: boolean) => void;
  label: string;
  disabled: boolean;
  invalid: boolean;
  /** Mensaje de validación: se enlaza al control para que lo oiga un lector de pantalla. */
  error?: string;
  unstyled: boolean;
  className?: string;
}

const toText = (value: unknown) => value == null ? "" : String(value);
const invalidBorder = "data-[invalid=true]:border-(--ui-grid-cell-invalid)";

type SlotClassNames = Record<string, string | undefined>;

// `editorProps` va después de lo que fija la celda, salvo value, onCommit/onValueChange y aria-label, que la celda
// conserva; `className` y `classNames` se suman a los de la celda.
function withEditorProps<T>(column: DataGridColumn<T>, own: { className?: string; classNames?: SlotClassNames }) {
  const { className, classNames, ...rest } = column.editorProps ?? {};
  const merged: SlotClassNames = { ...own.classNames };
  for (const [slot, name] of Object.entries((classNames ?? {}) as SlotClassNames)) merged[slot] = cn(merged[slot], name);
  return { ...rest, className: cn(own.className, className as string | undefined), classNames: merged };
}

// El Tooltip solo monta su contenido al abrirse: la descripción necesita un elemento propio, siempre presente.
function useLinkedError(error: string | undefined, describedBy: unknown) {
  const id = React.useId();
  return {
    describedBy: [describedBy, error && id].filter(Boolean).join(" ") || undefined,
    message: error ? <span id={id} hidden>{error}</span> : null,
  };
}

function TextEditor<T>({ column, value, draft, onDraftChange, onCommit, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const commit = () => {
    const text = toText(draft);
    onCommit(text === toText(value) ? value : text === "" ? null : text);
  };
  const { onBlur, onKeyDown, "aria-describedby": describedBy } = (column.editorProps ?? {}) as Pick<React.InputHTMLAttributes<HTMLInputElement>, "onBlur" | "onKeyDown" | "aria-describedby">;
  const linked = useLinkedError(error, describedBy);
  return <>
    <TextField size="sm" disabled={disabled} invalid={invalid} unstyled={unstyled}
      {...withEditorProps(column, { className: cn(className, !unstyled && invalidBorder) })} aria-label={label} aria-describedby={linked.describedBy} value={toText(draft)} onValueChange={onDraftChange}
      onBlur={event => { onBlur?.(event); commit(); }}
      onKeyDown={composeEventHandlers(onKeyDown, event => { if (event.key === "Enter") commit(); })} />
    {linked.message}
  </>;
}

const numberModes = { number: "decimal", currency: "currency", percent: "percent" } as const;

function NumberEditor<T>({ column, value, onCommit, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const linked = useLinkedError(error, column.editorProps?.["aria-describedby"]);
  return <>
    <NumberField size="sm" mode={numberModes[column.type as keyof typeof numberModes]} fractionDigits={column.fractionDigits} currencySymbol={column.currencySymbol}
      disabled={disabled} invalid={invalid} unstyled={unstyled}
      {...withEditorProps(column, { className: cn(className, !unstyled && invalidBorder) })} aria-label={label} aria-describedby={linked.describedBy} value={typeof value === "number" ? value : null} onCommit={onCommit} />
    {linked.message}
  </>;
}

const hiddenLabel = "sr-only";
const defaultValueOf = (option: unknown) => (option as { value: unknown }).value;
const defaultLabelOf = (option: unknown) => String((option as { label: unknown }).label ?? "");

// DateField confirma solo (blur y Enter): su texto es estado interno y el borrador de la celda no interviene.
// Estos campos enlazan `errorMessage` por sí mismos; el mensaje de la celda se ve en el Tooltip y aquí queda oculto.
function DateEditor<T>({ column, value, onCommit, onPopoverOpenChange, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  return <DateField clearable disabled={disabled} invalid={invalid} errorMessage={error} unstyled={unstyled}
    {...withEditorProps(column, { classNames: { label: hiddenLabel, root: cn(!unstyled && "min-w-40", className), control: cn(!unstyled && invalidBorder), error: error && hiddenLabel } })} label={label} value={typeof value === "string" ? value : null} onValueChange={onCommit} onOpenChange={open => { onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

function SelectEditor<T>({ column, value, onCommit, onPopoverOpenChange, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const options = React.useMemo(() => [...(column.options ?? [])], [column.options]);
  return <SearchableSelectField clearable disabled={disabled} invalid={invalid} errorMessage={error} unstyled={unstyled}
    options={options} getOptionValue={column.getOptionValue ?? defaultValueOf} getOptionLabel={column.getOptionLabel ?? defaultLabelOf}
    {...withEditorProps(column, { classNames: { label: hiddenLabel, root: cn(!unstyled && "min-w-36", className), control: cn(!unstyled && invalidBorder), error: error && hiddenLabel } })} label={label} value={value ?? null} onValueChange={next => onCommit(next ?? null)} onOpenChange={open => { onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

function CheckboxEditor<T>({ column, value, onCommit, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  return <CheckboxField disabled={disabled} invalid={invalid} errorMessage={error} unstyled={unstyled}
    {...withEditorProps(column, { classNames: { label: hiddenLabel, root: className, error: error && hiddenLabel } })} label={label} checked={value === true} onCheckedChange={checked => onCommit(checked === true)} />;
}

function RadioEditor<T>({ column, value, onCommit, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const options = column.options ?? [];
  const getValue = column.getOptionValue ?? defaultValueOf;
  const getLabel = column.getOptionLabel ?? defaultLabelOf;
  const radios = options.map(option => ({ value: String(getValue(option)), label: getLabel(option) }));
  return <RadioGroup orientation="horizontal" disabled={disabled} invalid={invalid} errorMessage={error} unstyled={unstyled}
    options={radios} {...withEditorProps(column, { classNames: { label: hiddenLabel, root: className, options: cn(!unstyled && "flex-nowrap whitespace-nowrap"), error: error && hiddenLabel } })} label={label} value={value == null ? undefined : String(value)}
    onValueChange={next => {
      const index = radios.findIndex(radio => radio.value === next);
      if (index >= 0) onCommit(getValue(options[index]));
    }} />;
}

// Componentes estables: el registro no crea tipos nuevos al renderizar la fila.
export const editCellRegistry: Partial<Record<DataGridColumnType, React.ComponentType<EditCellProps<any>>>> = {
  text: TextEditor,
  number: NumberEditor,
  currency: NumberEditor,
  percent: NumberEditor,
  date: DateEditor,
  select: SelectEditor,
  checkbox: CheckboxEditor,
  radio: RadioEditor,
};
