import * as React from "react";
import { cn } from "../../../lib";
import { Tooltip } from "../../../primitives";
import { useClientLayoutEffect } from "../use-grid-rows";
import type { DataGridColumn } from "../DataGrid.types";
import type { EditCellProps } from "./edit-cells";

const focusableSelector = "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex='-1'])";

export interface EditableCellProps<T> {
  rowId: string;
  column: DataGridColumn<T>;
  value: unknown;
  error?: string;
  onCommit: (value: unknown) => void;
  editor: React.ComponentType<EditCellProps<T>>;
  disabled: boolean;
  unstyled: boolean;
  editorClassName?: string;
  editorStyle?: React.CSSProperties;
  cellProps: React.TdHTMLAttributes<HTMLTableCellElement> & Record<`data-${string}`, unknown>;
}

// Contenido de popover (DateField, SearchableSelectField) que Radix monta en un portal.
const portalSelector = "[data-radix-popper-content-wrapper]";
const portalOf = (node: EventTarget | null) => node instanceof Element ? node.closest(portalSelector) : null;

// React hace burbujear los eventos de un portal hasta la celda aunque vivan fuera de su DOM.
function comesFromCell(event: React.SyntheticEvent<HTMLTableCellElement>) {
  return event.target instanceof Node && event.currentTarget.contains(event.target);
}

export function EditableCell<T>({ rowId, column, value, error, onCommit, editor: Editor, disabled, unstyled, editorClassName, editorStyle, cellProps }: EditableCellProps<T>) {
  const [draft, setDraft] = React.useState(value);
  const [draftDirty, setDraftDirty] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  const [committed, setCommitted] = React.useState(value);
  if (!Object.is(committed, value)) {
    setCommitted(value);
    setDraft(value);
    setDraftDirty(false);
  }

  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const reverting = React.useRef(false);
  // Radix cierra el popover antes de que este Escape llegue a la celda: el cierre se libera tras el evento, no durante.
  const popoverOpen = React.useRef(false);
  const onPopoverOpenChange = (open: boolean) => {
    if (open) popoverOpen.current = true;
    else setTimeout(() => { popoverOpen.current = false; }, 0);
  };
  useClientLayoutEffect(() => {
    if (!reverting.current) return;
    reverting.current = false;
    cellRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
  }, [editorKey]);

  const commit = (next: unknown) => {
    if (reverting.current) return;
    setDraftDirty(false);
    onCommit(next);
  };
  const markDirty = (event: React.SyntheticEvent<HTMLTableCellElement>) => {
    if (comesFromCell(event)) setDraftDirty(true);
  };
  const revert = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key !== "Escape" || popoverOpen.current || !draftDirty || !comesFromCell(event)) return;
    reverting.current = true;
    setDraft(value);
    setDraftDirty(false);
    setEditorKey(key => key + 1);
  };

  // NumberField omite onCommit si el número ya se confirmó: salir de la celda cierra el borrador igualmente.
  const leave = (event: React.FocusEvent<HTMLTableCellElement>) => {
    const next = event.relatedTarget;
    if (event.currentTarget.contains(next)) return;
    // Pasar del editor a su popover (o moverse dentro de él) no es salir de la celda.
    const from = portalOf(event.target);
    if (portalOf(next) && (!from || from === portalOf(next))) return;
    if (comesFromCell(event) || from) setDraftDirty(false);
  };

  return <td {...cellProps} ref={cellRef} data-editable="" data-draft-dirty={draftDirty || undefined} onInputCapture={markDirty} onPasteCapture={markDirty} onKeyDown={revert} onBlur={leave}>
    {/* El Tooltip siempre montado: que aparezca un error no debe remontar el editor ni quitarle el foco. */}
    <Tooltip content={error} open={Boolean(error) && tooltipOpen} onOpenChange={setTooltipOpen} unstyled={unstyled}>
      <div data-slot="editor">
        <Editor key={editorKey} rowId={rowId} column={column} value={value} draft={draft} onDraftChange={setDraft} onCommit={commit} onPopoverOpenChange={onPopoverOpenChange} label={column.header}
          disabled={disabled} invalid={Boolean(error)} unstyled={unstyled} style={editorStyle}
          className={cn(!unstyled && "h-(--ui-control-height) data-[invalid=true]:border-(--ui-grid-cell-invalid)", editorClassName)} />
      </div>
    </Tooltip>
  </td>;
}
