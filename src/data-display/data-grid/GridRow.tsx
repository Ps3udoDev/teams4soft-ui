import * as React from "react";
import type { Column, ColumnPinningPosition, Row, RowData } from "@tanstack/react-table";
import { cn } from "../../lib";
import { EditableCell, type CellFocusPlan } from "./cells/EditableCell";
import { editCellRegistry } from "./cells/edit-cells";
import { readCellRegistry } from "./cells/read-cells";
import { isCellEditable } from "./validation";
import type { GridFeatures } from "./table-features";
import type { GridRowsStore } from "./grid-rows-store";
import type { DataGridCellComponent, DataGridClassNames, DataGridColumn, DataGridDensity, DataGridHandle, DataGridSelectionMode } from "./DataGrid.types";

const interactiveSelector = "button, input, select, textarea, a, [role=checkbox], [role=radio], [data-editable]";
// Un portal dentro de una celda burbuja sus clics por React hasta la fila aunque su DOM esté fuera de ella.
function isInteractive(event: React.MouseEvent<HTMLTableRowElement>) {
  if (!(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return true;
  return Boolean(event.target.closest(interactiveSelector));
}

export function definition<T extends RowData>(column: Column<GridFeatures, T, unknown>): DataGridColumn<T> | undefined {
  return (column.columnDef.meta as { column?: DataGridColumn<T> } | undefined)?.column;
}

// TanStack v9 fija por inicio y fin; la API y los estilos del grid siguen siendo físicos.
export function frozenSide(position: ColumnPinningPosition): "left" | "right" | undefined {
  return position === "start" ? "left" : position === "end" ? "right" : undefined;
}

/** Lo que la fila necesita al renderizar. No se compara: lo cubren `presentationKey` y las demás props. */
export interface GridRowView<T extends RowData> {
  store: GridRowsStore<T>;
  grid: DataGridHandle<T>;
  density: DataGridDensity;
  loading: boolean;
  readOnly: boolean;
  editing: boolean;
  unstyled: boolean;
  revision: number;
  selectionMode: DataGridSelectionMode;
  classNames?: Partial<DataGridClassNames>;
  styles?: Partial<Record<keyof DataGridClassNames, React.CSSProperties>>;
  cellStyle: (column: Column<GridFeatures, T, unknown>) => React.CSSProperties;
  renderSelection: (rowId: string) => React.ReactNode;
  // Identidades estables (latest ref): se pueden conservar de un render anterior.
  selectRow: (rowId: string) => void;
  onRowClick: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowDoubleClick: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  commitCell: (rowId: string, column: DataGridColumn<T>, value: unknown, grid: DataGridHandle<T>) => void;
  focusAfterEnter: (plan: CellFocusPlan) => void;
}

export interface GridRowProps<T extends RowData> {
  row: Row<GridFeatures, T>;
  isSelected: boolean;
  isDirty: boolean;
  errorsForRow?: Record<string, string>;
  rowClassName?: string;
  columnsKey: string;
  presentationKey: string;
  columns: DataGridColumn<T>[];
  cellTypes?: Record<string, DataGridCellComponent<T>>;
  view: GridRowView<T>;
}

function GridRowInner<T extends RowData>({ row, isSelected, isDirty, errorsForRow, rowClassName, cellTypes, view }: GridRowProps<T>) {
  const { store, grid, density, loading, readOnly, editing, unstyled, revision, selectionMode, classNames, styles, cellStyle, renderSelection, selectRow, onRowClick, onRowDoubleClick, commitCell, focusAfterEnter } = view;
  const baseRow = store.getBaseRow(row.id);
  const rowHeight = density === "compact" ? "h-(--ui-grid-row-height-compact)" : "h-(--ui-grid-row-height)";
  const editorDensity = density === "compact" ? "py-0.5 [--ui-control-height:var(--ui-grid-editor-height-compact)]" : "py-1 [--ui-control-height:var(--ui-grid-editor-height)]";
  return <tr data-slot="row" data-selected={isSelected || undefined} data-dirty={isDirty || undefined} data-invalid={errorsForRow ? true : undefined} aria-selected={selectionMode === "none" ? undefined : isSelected || undefined}
    className={cn(!unstyled && rowHeight, !unstyled && "[--ui-grid-current-row-bg:var(--ui-background)] even:[--ui-grid-current-row-bg:var(--ui-grid-row-alt)] hover:[--ui-grid-current-row-bg:var(--ui-grid-row-hover)] data-selected:[--ui-grid-current-row-bg:var(--ui-grid-row-selected)] bg-(--ui-grid-current-row-bg)", rowClassName, classNames?.row)} style={styles?.row}
    onClick={event => { if (loading || isInteractive(event)) return; if (selectionMode === "single") selectRow(row.id); onRowClick(row.original, event); }}
    onDoubleClick={event => { if (!loading && !isInteractive(event)) onRowDoubleClick(row.original, event); }}>
    {row.getVisibleCells().map(cell => {
      const col = definition(cell.column);
      const type = col?.type ?? "text";
      const CustomType = cellTypes?.[type];
      const editable = col !== undefined && !readOnly && isCellEditable(col, row.original);
      const Editor = col && !CustomType && editable ? editCellRegistry[type as keyof typeof editCellRegistry] : undefined;
      const Cell = CustomType ?? readCellRegistry[type as keyof typeof readCellRegistry] ?? readCellRegistry.text;
      const align = col?.align ?? (["number", "currency", "percent"].includes(type) ? "right" : "left");
      const pinned = cell.column.getIsPinned();
      const value = col && row.original[col.field];
      const error = col && errorsForRow?.[col.field];
      const cellProps = {
        "data-slot": "cell", "data-align": align, "data-frozen": frozenSide(pinned),
        "data-dirty": (editing && col && baseRow !== undefined && !Object.is(baseRow[col.field], value)) || undefined,
        "data-invalid": error ? true : undefined,
        className: cn(!unstyled && "border-b border-ui-border px-3 py-2", !unstyled && Editor && editorDensity, !unstyled && pinned && "bg-ui-background", classNames?.cell),
        style: { ...cellStyle(cell.column), ...(!unstyled && pinned ? { backgroundImage: "linear-gradient(var(--ui-grid-current-row-bg), var(--ui-grid-current-row-bg))" } : {}), ...styles?.cell },
      };
      if (col && Editor) return <EditableCell key={`${cell.id}:${revision}`} rowId={row.id} column={col} value={value} error={error} editor={Editor} cellProps={cellProps}
        onCommit={next => commitCell(row.id, col, next, grid)} onEnterCommit={focusAfterEnter} disabled={loading} unstyled={unstyled} editorClassName={classNames?.editor} editorStyle={styles?.editor} />;
      // Una celda propia editable es destino de focusCell igual que las de la librería.
      const focusTarget = col && CustomType && editable ? { "data-row-id": row.id, "data-field": col.field } : undefined;
      return <td key={cell.id} {...cellProps} {...focusTarget}>
        {cell.column.id === "__select" ? renderSelection(row.id) : col && <Cell column={col} row={row.original} value={value} rowId={row.id} grid={grid}
          editable={editable} error={error} onCommit={next => commitCell(row.id, col, next, grid)} />}
      </td>;
    })}
  </tr>;
}

function sameRow<T extends RowData>(prev: GridRowProps<T>, next: GridRowProps<T>) {
  return prev.row.original === next.row.original
    && prev.isSelected === next.isSelected
    && prev.isDirty === next.isDirty
    && prev.errorsForRow === next.errorsForRow
    && prev.rowClassName === next.rowClassName
    && prev.columnsKey === next.columnsKey
    && prev.presentationKey === next.presentationKey
    && prev.columns === next.columns
    && prev.cellTypes === next.cellTypes;
}

export const GridRow = React.memo(GridRowInner, sameRow) as typeof GridRowInner;
