import * as React from "react";
import { DateField, SearchableSelectField, TextField } from "../../../forms";
import type { DataGridColumn, DataGridMessages, DataGridClassNames } from "../DataGrid.types";
import { resolveFilterKind } from "./filter-fns";

export interface FilterCellProps<T> {
  column: DataGridColumn<T>;
  value: unknown;
  onChange: (value: unknown) => void;
  messages: DataGridMessages;
  classNames?: Partial<DataGridClassNames>;
  unstyled?: boolean;
  disabled?: boolean;
}

function parseNumberFilter(text: string): number | undefined {
  const number = Number(text.replace(/,/g, ""));
  return text.trim() && Number.isFinite(number) ? number : undefined;
}

export function FilterCell<T>({ column, value, onChange, messages, unstyled, disabled }: FilterCellProps<T>) {
  const kind = resolveFilterKind(column);
  const [draft, setDraft] = React.useState(String(value ?? ""));
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // El número filtrado no reescribe lo tecleado: conserva comas y texto inválido.
  React.useEffect(() => { setDraft(current => kind === "number" && parseNumberFilter(current) === value ? current : String(value ?? "")); }, [value, kind]);
  React.useEffect(() => () => { clearTimeout(timer.current); }, []);
  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  if (!kind) return null;
  const label = messages.filterLabel(column.header);
  if (kind === "date") return <DateField label={label} classNames={{ label: "sr-only" }} value={typeof value === "string" ? value : null} onValueChange={onChange} clearable unstyled={unstyled} disabled={disabled} open={disabled ? false : open} onOpenChange={setOpen} />;
  if (kind === "select") {
    const booleanOptions = [{ value: true, label: messages.yes }, { value: false, label: messages.no }];
    const options = column.type === "checkbox" ? booleanOptions : [...(column.options ?? [])];
    const getValue = column.type === "checkbox" ? (o: unknown) => (o as { value: boolean }).value : column.getOptionValue ?? ((o: unknown) => (o as { value: unknown }).value);
    const getLabel = column.type === "checkbox" ? (o: unknown) => (o as { label: string }).label : column.getOptionLabel ?? ((o: unknown) => String((o as { label: unknown }).label ?? ""));
    return <SearchableSelectField label={label} classNames={{ label: "sr-only" }} options={options} getOptionValue={getValue} getOptionLabel={getLabel} value={value ?? null} onValueChange={next => onChange(next ?? undefined)} clearable unstyled={unstyled} disabled={disabled} open={disabled ? false : open} onOpenChange={setOpen} />;
  }
  return <TextField aria-label={label} value={draft} inputMode={kind === "number" ? "decimal" : undefined} unstyled={unstyled} disabled={disabled} onValueChange={next => {
    setDraft(next);
    clearTimeout(timer.current);
    if (kind === "number") onChange(parseNumberFilter(next));
    else timer.current = setTimeout(() => onChange(next || undefined), 200);
  }} />;
}
