import * as React from "react";
import { useClientLayoutEffect } from "../../../lib";
import { Tooltip } from "../../../primitives";
import type { DataGridColumn } from "../DataGrid.types";
import type { EditCellProps } from "./edit-cells";

const focusableSelector = "input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex='-1'])";

// Enter activa estos controles del editor (limpiar, abrir calendario); checkbox y radio lo ignoran.
const actionSelector = "button:not([role=checkbox]):not([role=radio]), a[href]";

/** Destino del foco tras un Enter o un Tab. Se calcula antes de confirmar: la fila puede moverse o desaparecer. */
export interface CellFocusPlan {
  rowId: string;
  field: string;
  next?: string;
  previous?: string;
  /** Tab: el navegador ya mueve el foco; el plan solo actúa si la fila dejó de estar visible. */
  onlyIfGone?: boolean;
}

// `window.event` no es fiable para saber qué evento cerró el popover (jsdom con React 18 lo deja obsoleto): el último keydown se anota en captura de ventana.
let lastKeydown: Event | undefined;
let trackingKeydown = false;
function trackKeydown() {
  if (trackingKeydown || typeof window === "undefined") return;
  trackingKeydown = true;
  window.addEventListener("keydown", event => { lastKeydown = event; }, true);
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
export function settleCellFocus(table: HTMLElement, { rowId, field, next, previous, onlyIfGone }: CellFocusPlan) {
  const own = findCell(table, rowId, field);
  if (onlyIfGone && own) return;
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
  /** Se llama tras el Enter o el Tab que confirma, en el mismo lote que la escritura al store. */
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
  const [editorKey, setEditorKey] = React.useState(0);
  const [tooltipOpen, setTooltipOpen] = React.useState(false);
  // Error que el editor detecta por su cuenta (carga remota); la validación de la celda tiene prioridad.
  const [loadError, setLoadError] = React.useState<string | undefined>(undefined);
  const shownError = error ?? loadError;
  const clearDirtyOnCommit = React.useRef(false);
  const [committed, setCommitted] = React.useState(value);
  if (!Object.is(committed, value)) {
    setCommitted(value);
    setDraft(value);
    clearDirtyOnCommit.current = true;
  }

  const cellRef = React.useRef<HTMLTableCellElement>(null);
  // El borrador pendiente vive en el DOM (data-draft-dirty), no en estado: marcarlo no debe re-renderizar el editor,
  // porque un render entre el evento de entrada y su onChange restaura el valor controlado y pierde el primer carácter.
  const draftDirty = React.useRef(false);
  const setDirty = (dirty: boolean) => {
    draftDirty.current = dirty;
    if (dirty) cellRef.current?.setAttribute("data-draft-dirty", "");
    else cellRef.current?.removeAttribute("data-draft-dirty");
  };
  const reverting = React.useRef(false);
  // Estado abierto del popover del propio editor. Radix lo cierra con un listener de documento que corre antes
  // de que el Escape llegue a la celda: se anota el evento que provocó el cierre para no tratarlo también como revertir.
  const popoverOpen = React.useRef(false);
  const closedByEvent = React.useRef<Event | undefined>(undefined);
  const onPopoverOpenChange = (open: boolean) => {
    popoverOpen.current = open;
    closedByEvent.current = open ? undefined : lastKeydown;
  };
  const pendingSearches = React.useRef(0);
  const trackSearch = React.useCallback(<V,>(search: Promise<V>) => {
    pendingSearches.current += 1;
    return search.finally(() => { pendingSearches.current -= 1; });
  }, []);
  React.useEffect(trackKeydown, []);
  useClientLayoutEffect(() => {
    if (clearDirtyOnCommit.current) { clearDirtyOnCommit.current = false; setDirty(false); }
  });
  useClientLayoutEffect(() => {
    if (!reverting.current) return;
    reverting.current = false;
    cellRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
  }, [editorKey]);

  const commit = (next: unknown) => {
    if (reverting.current) return;
    setDirty(false);
    onCommit(next);
  };
  const markDirty = (event: React.SyntheticEvent<HTMLTableCellElement>) => {
    if (comesFromCell(event)) setDirty(true);
  };
  const revert = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key !== "Escape" || popoverOpen.current || event.nativeEvent === closedByEvent.current || !draftDirty.current || !comesFromCell(event)) return;
    reverting.current = true;
    setDraft(value);
    setDirty(false);
    setEditorKey(key => key + 1);
  };

  // El plan se fija en captura, antes de que el editor confirme. El preventDefault espera a la burbuja porque
  // NumberField no confirma un Enter ya cancelado.
  const enterPlan = React.useRef<CellFocusPlan | undefined>(undefined);
  const tabPlan = React.useRef<CellFocusPlan | undefined>(undefined);
  const planFocus = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
    const cell = event.currentTarget;
    const plan = () => ({ rowId, field: column.field, next: neighbourRowId(cell, column.field, "nextElementSibling"), previous: neighbourRowId(cell, column.field, "previousElementSibling") });
    const leavesCell = event.key === "Enter" && !popoverOpen.current && comesFromCell(event) && !(event.target as Element).closest(actionSelector);
    enterPlan.current = leavesCell ? plan() : undefined;
    tabPlan.current = event.key === "Tab" && comesFromCell(event) ? { ...plan(), onlyIfGone: true } : undefined;
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
    const plan = tabPlan.current;
    tabPlan.current = undefined;
    // Con el popover del editor abierto, el foco puede estar en su portal: no es salir de la celda.
    if (popoverOpen.current) return;
    if (!comesFromCell(event) || event.currentTarget.contains(event.relatedTarget)) return;
    // El Enter o Tab que lanzó la búsqueda ya movió el foco, pero su resultado aún puede abrir un modal que se cancele.
    if (pendingSearches.current === 0) setDirty(false);
    // Si la confirmación hace desaparecer la fila (un filtro), un destino del Tab en esa fila se va con ella y el foco caería en <body>.
    if (plan && event.currentTarget.closest("tr")?.contains(event.relatedTarget)) onEnterCommit(plan);
  };

  return <td {...cellProps} ref={cellRef} data-editable="" data-row-id={rowId} data-field={column.field} onInputCapture={markDirty} onPasteCapture={markDirty} onKeyDownCapture={planFocus} onKeyDown={handleKeyDown} onBlur={leave}>
    {/* El Tooltip siempre montado: que aparezca un error no debe remontar el editor ni quitarle el foco. */}
    <Tooltip content={shownError} open={Boolean(shownError) && tooltipOpen} onOpenChange={setTooltipOpen} unstyled={unstyled}>
      <div data-slot="editor" className={editorClassName} style={editorStyle}>
        <Editor key={editorKey} rowId={rowId} column={column} value={value} draft={draft} onDraftChange={setDraft} onCommit={commit} onPopoverOpenChange={onPopoverOpenChange} trackSearch={trackSearch} onLoadError={setLoadError} label={column.header}
          disabled={disabled} invalid={Boolean(error)} error={error} unstyled={unstyled} className={unstyled ? undefined : "h-(--ui-control-height)"} />
      </div>
    </Tooltip>
  </td>;
}
