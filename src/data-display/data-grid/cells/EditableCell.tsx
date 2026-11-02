import * as React from "react";
import { cn } from "../../../lib";
import { Tooltip } from "../../../primitives";
import { useClientLayoutEffect } from "../use-grid-rows";
import type { DataGridColumn } from "../DataGrid.types";
import type { EditCellProps } from "./edit-cells";

const focusableSelector = "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex='-1'])";

// Enter activa estos controles del editor (limpiar, abrir calendario); checkbox y radio lo ignoran.
const actionSelector = "button:not([role=checkbox]):not([role=radio]), a[href]";

/** Destino del foco tras un Enter. Se calcula antes de confirmar: la fila puede moverse o desaparecer. */
export interface CellFocusPlan {
  rowId: string;
  field: string;
  next?: string;
  previous?: string;
}

function findCell(root: Element, rowId: string, field: string) {
  return Array.from(root.querySelectorAll<HTMLElement>("td[data-row-id]")).find(cell => cell.dataset.rowId === rowId && cell.dataset.field === field);
}

export function focusCellElement(root: Element, rowId: string, field: string): boolean {
  const target = findCell(root, rowId, field)?.querySelector<HTMLElement>(focusableSelector);
  target?.focus();
  return target?.matches(":focus") ?? false;
}

// Una celda con error conserva el foco: Enter no baja hasta corregirla; Tab sí permite salir.
export function settleCellFocus(table: HTMLElement, { rowId, field, next, previous }: CellFocusPlan) {
  const own = findCell(table, rowId, field);
  const invalid = own && (own.matches("[data-invalid]") || own.querySelector("[aria-invalid='true']"));
  if (!invalid && next && focusCellElement(table, next, field)) return;
  // Reordenar la fila puede sacar el foco de la celda aunque siga montada.
  if (own?.contains(own.ownerDocument.activeElement) || focusCellElement(table, rowId, field)) return;
  if (previous && focusCellElement(table, previous, field)) return;
  table.focus();
}

// Solo las celdas editables llevan data-field: las bloqueadas de la columna se saltan.
function neighbourRowId(cell: Element, field: string, direction: "nextElementSibling" | "previousElementSibling") {
  for (let row = cell.closest("tr")?.[direction]; row; row = row[direction]) {
    const match = Array.from(row.children).find(child => child instanceof HTMLElement && child.dataset.field === field) as HTMLElement | undefined;
    if (match) return match.dataset.rowId;
  }
  return undefined;
}

export interface EditableCellProps<T> {
  rowId: string;
  column: DataGridColumn<T>;
  value: unknown;
  error?: string;
  onCommit: (value: unknown) => void;
  /** Se llama tras el Enter que confirma, en el mismo lote que la escritura al store. */
  onEnterCommit: (plan: CellFocusPlan) => void;
  editor: React.ComponentType<EditCellProps<T>>;
  disabled: boolean;
  unstyled: boolean;
  editorClassName?: string;
  editorStyle?: React.CSSProperties;
  cellProps: React.TdHTMLAttributes<HTMLTableCellElement> & Record<`data-${string}`, unknown>;
}

// React hace burbujear los eventos de un portal hasta la celda aunque vivan fuera de su DOM.
function comesFromCell(event: React.SyntheticEvent<HTMLTableCellElement>) {
  return event.target instanceof Node && event.currentTarget.contains(event.target);
}

export function EditableCell<T>({ rowId, column, value, error, onCommit, onEnterCommit, editor: Editor, disabled, unstyled, editorClassName, editorStyle, cellProps }: EditableCellProps<T>) {
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
  // Estado abierto del popover del propio editor. Radix lo cierra con un listener de documento que corre antes
  // de que el Escape llegue a la celda: se anota el evento que provocó el cierre para no tratarlo también como revertir.
  const popoverOpen = React.useRef(false);
  const closedByEvent = React.useRef<Event | undefined>(undefined);
  const onPopoverOpenChange = (open: boolean) => {
    popoverOpen.current = open;
    closedByEvent.current = open ? undefined : window.event;
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
    if (event.key !== "Escape" || popoverOpen.current || event.nativeEvent === closedByEvent.current || !draftDirty || !comesFromCell(event)) return;
    reverting.current = true;
    setDraft(value);
    setDraftDirty(false);
    setEditorKey(key => key + 1);
  };

  // El plan se fija en captura, antes de que el editor confirme. El preventDefault espera a la burbuja porque
  // NumberField no confirma un Enter ya cancelado.
  const enterPlan = React.useRef<CellFocusPlan | undefined>(undefined);
  const planEnter = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    const cell = event.currentTarget;
    const leavesCell = event.key === "Enter" && !popoverOpen.current && comesFromCell(event) && !(event.target as Element).closest(actionSelector);
    enterPlan.current = leavesCell
      ? { rowId, field: column.field, next: neighbourRowId(cell, column.field, "nextElementSibling"), previous: neighbourRowId(cell, column.field, "previousElementSibling") }
      : undefined;
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    revert(event);
    if (!enterPlan.current) return;
    event.preventDefault();
    onEnterCommit(enterPlan.current);
    enterPlan.current = undefined;
  };

  // NumberField omite onCommit si el número ya se confirmó: salir de la celda cierra el borrador igualmente.
  const leave = (event: React.FocusEvent<HTMLTableCellElement>) => {
    // Con el popover del editor abierto, el foco puede estar en su portal: no es salir de la celda.
    if (popoverOpen.current) return;
    if (comesFromCell(event) && !event.currentTarget.contains(event.relatedTarget)) setDraftDirty(false);
  };

  return <td {...cellProps} ref={cellRef} data-editable="" data-row-id={rowId} data-field={column.field} data-draft-dirty={draftDirty || undefined} onInputCapture={markDirty} onPasteCapture={markDirty} onKeyDownCapture={planEnter} onKeyDown={handleKeyDown} onBlur={leave}>
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
