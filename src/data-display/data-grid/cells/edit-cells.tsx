import * as React from "react";
import { NumberField, TextField } from "../../../forms";
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
  label: string;
  disabled: boolean;
  invalid: boolean;
  unstyled: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const toText = (value: unknown) => value == null ? "" : String(value);

function TextEditor<T>({ value, draft, onDraftChange, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  const commit = () => {
    const text = toText(draft);
    onCommit(text === toText(value) ? value : text === "" ? null : text);
  };
  return <TextField size="sm" aria-label={label} value={toText(draft)} onValueChange={onDraftChange} onBlur={commit}
    onKeyDown={event => { if (event.key === "Enter") commit(); }}
    disabled={disabled} invalid={invalid} unstyled={unstyled} className={className} style={style} />;
}

const numberModes = { number: "decimal", currency: "currency", percent: "percent" } as const;

function NumberEditor<T>({ column, value, onCommit, label, disabled, invalid, unstyled, className, style }: EditCellProps<T>) {
  // NumberField confirma en cada blur: sin cambios se devuelve el valor intacto para no redondearlo a fractionDigits.
  const touched = React.useRef(false);
  return <NumberField size="sm" aria-label={label} value={typeof value === "number" ? value : null}
    mode={numberModes[column.type as keyof typeof numberModes]} fractionDigits={column.fractionDigits} currencySymbol={column.currencySymbol}
    onValueChange={() => { touched.current = true; }} onCommit={next => onCommit(touched.current ? next : value)}
    disabled={disabled} invalid={invalid} unstyled={unstyled} className={className} style={style} />;
}

// Componentes estables: el registro no crea tipos nuevos al renderizar la fila.
export const editCellRegistry: Partial<Record<DataGridColumnType, React.ComponentType<EditCellProps<any>>>> = {
  text: TextEditor,
  number: NumberEditor,
  currency: NumberEditor,
  percent: NumberEditor,
};
