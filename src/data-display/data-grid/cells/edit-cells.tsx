import * as React from "react";
import { CheckboxField, DateField, NumberField, RadioGroup, SearchableSelectField, TextField } from "../../../forms";
import { cn, composeEventHandlers } from "../../../lib";
// Ciclo de módulos: EntityLookupField -> LookupDialog -> DataGrid -> GridRow -> aquí. Solo se usa al renderizar LookupEditor.
import { EntityLookupField } from "../../entity-lookup-field/EntityLookupField";
import type { DataGridColumn, DataGridColumnType } from "../DataGrid.types";
import { optionLabelOf, optionValueOf, useRemoteLookup, useRemoteSelect } from "../use-remote-options";

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
  /** El editor registra una búsqueda en curso: lo escrito sigue siendo revertible aunque el foco salga de la celda. */
  trackSearch?: <V>(search: Promise<V>) => Promise<V>;
  /** El editor avisa de un error propio (carga remota) para que la celda lo muestre en su tooltip. */
  onLoadError?: (message: string | undefined) => void;
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
const defaultValueOf = optionValueOf;
const defaultLabelOf = optionLabelOf;

// DateField confirma solo (blur y Enter): su texto es estado interno y el borrador de la celda no interviene.
// Estos campos enlazan `errorMessage` por sí mismos; el mensaje de la celda se ve en el Tooltip y aquí queda oculto.
function DateEditor<T>({ column, value, onCommit, onPopoverOpenChange, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  return <DateField clearable disabled={disabled} invalid={invalid} errorMessage={error} unstyled={unstyled}
    {...withEditorProps(column, { classNames: { label: hiddenLabel, root: cn(!unstyled && "min-w-40", className), control: cn(!unstyled && invalidBorder), error: error && hiddenLabel } })} label={label} value={typeof value === "string" ? value : null} onValueChange={onCommit} onOpenChange={open => { onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

function SelectEditor<T>({ column, value, onCommit, onPopoverOpenChange, onLoadError, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const staticOptions = React.useMemo(() => [...(column.options ?? [])], [column.options]);
  const remote = useRemoteSelect(column, value);
  // Con loadOptions la búsqueda es del servidor; un error de validación pasa por delante del de carga.
  const loadFailed = remote.remote && remote.error;
  const shownError = error ?? (loadFailed ? remote.loadOptionsError : undefined);
  const reportedError = loadFailed ? remote.loadOptionsError : undefined;
  React.useEffect(() => { onLoadError?.(reportedError); }, [onLoadError, reportedError]);
  const remoteProps = remote.remote ? {
    options: remote.options, getOptionValue: remote.getOptionValue, getOptionLabel: remote.getOptionLabel,
    filterOption: remote.filterOption, loading: remote.loading, onInputValueChange: remote.onInputValueChange,
    // Una búsqueda que falla no es "sin resultados"; sin error queda el mensaje por defecto.
    emptyMessage: remote.error ? remote.loadOptionsError : undefined,
  } : { options: staticOptions, getOptionValue: column.getOptionValue ?? defaultValueOf, getOptionLabel: column.getOptionLabel ?? defaultLabelOf };
  return <SearchableSelectField clearable disabled={disabled} invalid={invalid || loadFailed} errorMessage={shownError} unstyled={unstyled}
    {...remoteProps}
    {...withEditorProps(column, { classNames: { label: hiddenLabel, root: cn(!unstyled && "min-w-36", className), control: cn(!unstyled && invalidBorder), error: shownError && hiddenLabel } })} label={label} value={value ?? null}
    onValueChange={(next, option) => { remote.onPick(option); onCommit(next ?? null); }}
    onOpenChange={open => { remote.onOpenChange(open); onPopoverOpenChange?.(open); (column.editorProps?.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />;
}

// React hace burbujear por el árbol los eventos del modal: ni su foco ni su puntero deben abrir el Tooltip de la celda,
// que quedaría sobre el modal y se llevaría su Escape.
function stopFromPortal(event: React.SyntheticEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation();
}

function LookupEditor<T>({ column, value, onCommit, onPopoverOpenChange, trackSearch, onLoadError, label, disabled, invalid, error, unstyled, className }: EditCellProps<T>) {
  const lookup = useRemoteLookup<T, any>(column, value);
  const [searchFailed, setSearchFailed] = React.useState(false);
  const reportedError = searchFailed ? lookup.loadOptionsError : undefined;
  React.useEffect(() => { onLoadError?.(reportedError); }, [onLoadError, reportedError]);
  const editorProps = column.editorProps ?? {};
  const linked = useLinkedError(error ?? reportedError, editorProps["aria-describedby"]);
  const { lookupColumns, header, getOptionLabel = defaultLabelOf } = column;
  const columns = React.useMemo(
    () => lookupColumns ?? [{ field: "label", header, sortable: false, filter: false, format: (_: unknown, item: unknown) => getOptionLabel(item) }],
    [lookupColumns, header, getOptionLabel],
  );
  return <div style={{ display: "contents" }} onFocus={stopFromPortal} onPointerMove={stopFromPortal}>
    <EntityLookupField<any> resolveOnBlur searchOnEnter="dirty" disabled={disabled} invalid={invalid || searchFailed} unstyled={unstyled} columns={columns}
      {...withEditorProps(column, { className, classNames: { root: cn(!unstyled && "min-w-40"), trigger: cn(!unstyled && "h-(--ui-control-height) w-(--ui-control-height) shrink-0") } })}
      aria-label={label} aria-describedby={linked.describedBy}
      selectedItem={lookup.selectedItem} getItemId={lookup.getItemId} getItemLabel={lookup.getItemLabel}
      search={query => {
        setSearchFailed(false);
        const search = lookup.search(query);
        return trackSearch ? trackSearch(search) : search;
      }}
      onSearchError={failure => { setSearchFailed(true); (editorProps.onSearchError as ((failure: unknown) => void) | undefined)?.(failure); }}
      onSelectionChange={item => {
        if (item === null) return onCommit(null);
        lookup.remember(item);
        onCommit(lookup.valueOf(item));
      }}
      onOpenChange={open => { onPopoverOpenChange?.(open); (editorProps.onOpenChange as ((open: boolean) => void) | undefined)?.(open); }} />
    {linked.message}
  </div>;
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
  lookup: LookupEditor,
  checkbox: CheckboxEditor,
  radio: RadioEditor,
};

/** Un lookup sin `loadOptions` ni `options` no tiene dónde buscar: se queda en lectura y `cellTypes` puede darle celda. */
export function editorFor<T>(column: DataGridColumn<T>): React.ComponentType<EditCellProps<any>> | undefined {
  const type = column.type ?? "text";
  if (type === "lookup" && !column.loadOptions && column.options === undefined) return undefined;
  return editCellRegistry[type as keyof typeof editCellRegistry];
}
