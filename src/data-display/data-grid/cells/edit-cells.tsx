import * as React from "react";
import { CheckboxField, DateField, NumberField, RadioGroup, SearchableSelectField, TextField } from "../../../forms";
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
  unstyled: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const toText = (value: unknown) => value == null ? "" : String(value);

// `editorProps` va después de lo que fija la celda, salvo value, onCommit/onValueChange y aria-label, que la celda conserva.
function TextEditor<T>({ column, value, draft, onDraftChange, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  const commit = () => {
    const text = toText(draft);
    onCommit(text === toText(value) ? value : text === "" ? null : text);
  };
  return <TextField size="sm" onBlur={commit} onKeyDown={event => { if (event.key === "Enter") commit(); }}
    disabled={disabled} invalid={invalid} unstyled={unstyled} className={className} style={style}
    {...column.editorProps} aria-label={label} value={toText(draft)} onValueChange={onDraftChange} />;
}

const numberModes = { number: "decimal", currency: "currency", percent: "percent" } as const;

function NumberEditor<T>({ column, value, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  // NumberField confirma en cada blur: sin cambios se devuelve el valor intacto para no redondearlo a fractionDigits.
  const touched = React.useRef(false);
  // Un valor externo reescribe el texto de NumberField: lo tecleado antes ya no cuenta como cambio.
  React.useEffect(() => { touched.current = false; }, [value]);
  const commit = (next: number | null) => {
    const changed = touched.current;
    touched.current = false;
    onCommit(changed ? next : value);
  };
  return <NumberField size="sm" mode={numberModes[column.type as keyof typeof numberModes]} fractionDigits={column.fractionDigits} currencySymbol={column.currencySymbol}
    disabled={disabled} invalid={invalid} unstyled={unstyled} className={className} style={style}
    {...column.editorProps} aria-label={label} value={typeof value === "number" ? value : null}
    onValueChange={() => { touched.current = true; }} onCommit={commit} />;
}

const hiddenLabel = "sr-only";
const defaultValueOf = (option: unknown) => (option as { value: unknown }).value;
const defaultLabelOf = (option: unknown) => String((option as { label: unknown }).label ?? "");

// DateField confirma solo (blur y Enter): su texto es estado interno y el borrador de la celda no interviene.
function DateEditor<T>({ column, value, onCommit, onPopoverOpenChange, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  return <DateField classNames={{ label: hiddenLabel, root: className }} style={style} clearable disabled={disabled} invalid={invalid} unstyled={unstyled}
    {...column.editorProps} label={label} value={typeof value === "string" ? value : null} onValueChange={onCommit} onOpenChange={open => { onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

function SelectEditor<T>({ column, value, onCommit, onPopoverOpenChange, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  const options = React.useMemo(() => [...(column.options ?? [])], [column.options]);
  return <SearchableSelectField classNames={{ label: hiddenLabel, root: className }} style={style} clearable disabled={disabled} invalid={invalid} unstyled={unstyled}
    options={options} getOptionValue={column.getOptionValue ?? defaultValueOf} getOptionLabel={column.getOptionLabel ?? defaultLabelOf}
    {...column.editorProps} label={label} value={value ?? null} onValueChange={next => onCommit(next ?? null)} onOpenChange={open => { onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

function CheckboxEditor<T>({ column, value, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  return <CheckboxField classNames={{ label: hiddenLabel, root: className }} style={style} disabled={disabled} invalid={invalid} unstyled={unstyled}
    {...column.editorProps} label={label} checked={value === true} onCheckedChange={checked => onCommit(checked === true)} />;
}

function RadioEditor<T>({ column, value, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  const options = column.options ?? [];
  const getValue = column.getOptionValue ?? defaultValueOf;
  const getLabel = column.getOptionLabel ?? defaultLabelOf;
  const radios = options.map(option => ({ value: String(getValue(option)), label: getLabel(option) }));
  return <RadioGroup orientation="horizontal" classNames={{ label: hiddenLabel, root: className }} style={style} disabled={disabled} invalid={invalid} unstyled={unstyled}
    options={radios} {...column.editorProps} label={label} value={value == null ? undefined : String(value)}
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
