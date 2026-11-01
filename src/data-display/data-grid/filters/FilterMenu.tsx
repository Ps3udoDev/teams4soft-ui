import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { DateField, SearchableSelectField, TextField } from "../../../forms";
import { cn } from "../../../lib";
import { Button } from "../../../primitives";
import type { DataGridColumn, DataGridFilterOperator, DataGridFilterValue, DataGridMessages } from "../DataGrid.types";
import { filterOperatorsFor, resolveFilterKind } from "./filter-fns";

export interface FilterMenuProps<T> {
  column: DataGridColumn<T>;
  value: DataGridFilterValue | undefined;
  onChange: (value: DataGridFilterValue | undefined) => void;
  messages: DataGridMessages;
  className?: string;
  style?: React.CSSProperties;
  menuClassName?: string;
  menuStyle?: React.CSSProperties;
  unstyled?: boolean;
  disabled?: boolean;
}

function parseNumberFilter(text: string): number | undefined {
  const number = Number(text.replace(/,/g, ""));
  return text.trim() && Number.isFinite(number) ? number : undefined;
}

function isEmptyFilter(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

export function FilterMenu<T>({ column, value, onChange, messages, className, style, menuClassName, menuStyle, unstyled = false, disabled = false }: FilterMenuProps<T>) {
  const kind = resolveFilterKind(column);
  const operators = filterOperatorsFor(column);
  const [open, setOpen] = React.useState(false);
  const [operator, setOperator] = React.useState<DataGridFilterOperator>(value?.operator ?? operators[0]!);
  const [draft, setDraft] = React.useState<unknown>(value?.value);
  const enterOnDateInput = React.useRef(false);
  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  if (!kind) return null;

  const active = value !== undefined;
  const label = messages.filterLabel(column.header);

  function handleOpenChange(next: boolean) {
    // Lo escrito solo cuenta al aplicar: cada apertura parte del filtro vigente.
    if (next) {
      setOperator(value?.operator ?? operators[0]!);
      setDraft(value?.value);
    }
    setOpen(next);
  }

  function applyValue(next: unknown) {
    onChange(isEmptyFilter(next) ? undefined : { operator, value: next });
    setOpen(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // El menú vive en un portal, pero su submit burbujea por React hasta un <form> de la página.
    event.stopPropagation();
    applyValue(kind === "number" ? parseNumberFilter(String(draft ?? "")) : draft);
  }

  function clear() {
    onChange(undefined);
    setOpen(false);
  }

  function renderValue() {
    // DateField cancela el submit de Enter: aquí se aplica la fecha que ese Enter confirma.
    if (kind === "date") return <div
      onKeyDownCapture={event => { enterOnDateInput.current = event.key === "Enter" && event.target instanceof HTMLInputElement; }}
      onKeyDown={() => { enterOnDateInput.current = false; }}>
      <DateField label={label} classNames={{ label: "sr-only" }} value={typeof draft === "string" ? draft : null} clearable unstyled={unstyled}
        onValueChange={next => {
          setDraft(next);
          if (enterOnDateInput.current) applyValue(next);
        }} />
    </div>;
    if (kind === "select") {
      const booleanOptions = [{ value: true, label: messages.yes }, { value: false, label: messages.no }];
      const options = column.type === "checkbox" ? booleanOptions : [...(column.options ?? [])];
      const getValue = column.type === "checkbox" ? (o: unknown) => (o as { value: boolean }).value : column.getOptionValue ?? ((o: unknown) => (o as { value: unknown }).value);
      const getLabel = column.type === "checkbox" ? (o: unknown) => (o as { label: string }).label : column.getOptionLabel ?? ((o: unknown) => String((o as { label: unknown }).label ?? ""));
      return <SearchableSelectField label={label} classNames={{ label: "sr-only" }} options={options} getOptionValue={getValue} getOptionLabel={getLabel} value={draft ?? null} onValueChange={next => setDraft(next ?? undefined)} clearable unstyled={unstyled} />;
    }
    return <TextField aria-label={label} value={String(draft ?? "")} inputMode={kind === "number" ? "decimal" : undefined} unstyled={unstyled} onValueChange={setDraft} />;
  }

  return (
    <Popover.Root open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button type="button" data-slot="filterButton" data-active={active || undefined} disabled={disabled} aria-label={active ? messages.filterActiveLabel(column.header) : label} style={style}
          className={cn(!unstyled && "inline-flex size-6 shrink-0 items-center justify-center rounded-(--radius-ui-sm) text-ui-foreground/60 hover:bg-ui-muted hover:text-ui-foreground focus-visible:outline-2 focus-visible:outline-ui-focus disabled:opacity-50 data-active:bg-ui-primary/10 data-active:text-ui-primary", className)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4-2v-4z" /></svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content aria-label={label} align="end" sideOffset={4} data-slot="filterMenu" style={menuStyle}
          className={cn(!unstyled && "z-50 w-64 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-3 text-sm font-normal text-ui-foreground shadow-md", menuClassName)}
          onOpenAutoFocus={event => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}>
          <form className={cn(!unstyled && "grid gap-2")} onSubmit={handleSubmit}>
            {operators.length > 1 && <select aria-label={messages.filterOperator} value={operator} onChange={event => setOperator(event.target.value as DataGridFilterOperator)}
              className={cn(!unstyled && "h-(--ui-control-height) w-full rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus")}>
              {operators.map(item => <option key={item} value={item}>{messages.filterOperators[item]}</option>)}
            </select>}
            {renderValue()}
            <div className={cn(!unstyled && "flex justify-end gap-2 pt-1")}>
              <Button type="button" variant="outline" size="sm" unstyled={unstyled} onClick={clear}>{messages.filterClear}</Button>
              <Button type="submit" size="sm" unstyled={unstyled}>{messages.filterApply}</Button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
