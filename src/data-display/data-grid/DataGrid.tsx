import * as React from "react";
import {
  getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  useReactTable, type Column, type ColumnDef, type ColumnFiltersState,
  type ColumnSizingState, type RowSelectionState, type SortingState, type Updater,
} from "@tanstack/react-table";
import { cn, devWarn } from "../../lib";
import { CheckboxField } from "../../forms";
import { LoadingOverlay, Progress, Skeleton } from "../../feedback";
import { useGridColumns } from "./use-grid-columns";
import { readCellRegistry, ReadCellStyleContext } from "./cells/read-cells";
import { resolveFilterKind } from "./filters/filter-fns";
import { FilterCell } from "./filters/FilterCell";
import { GridPaginator } from "./pagination/GridPaginator";
import { ColumnToggler } from "./toolbar/ColumnToggler";
import { GridToolbar } from "./toolbar/GridToolbar";
import { dataGridMessagesEs } from "./messages";
import type { DataGridColumn, DataGridHandle, DataGridProps } from "./DataGrid.types";

const interactiveSelector = "button, input, select, textarea, a, [role=checkbox], [role=radio]";
function isInteractive(event: React.MouseEvent<HTMLTableRowElement>) {
  return event.target instanceof Element && Boolean(event.target.closest(interactiveSelector));
}

function definition<T>(column: Column<T, unknown>): DataGridColumn<T> | undefined {
  return (column.columnDef.meta as { column?: DataGridColumn<T> } | undefined)?.column;
}

function DataGridInner<T>(props: DataGridProps<T>, ref: React.ForwardedRef<DataGridHandle<T>>) {
  const {
    columns, getRowId, value, defaultValue, columnVisibility, onColumnVisibilityChange,
    persistKey, columnToggler = true, selectionMode = "none", selection, onSelectionChange,
    pagination, loading = false, toolbar, initialSort, density = "normal", maxHeight,
    emptyState, cellTypes, className, classNames, styles, style, unstyled = false,
  } = props;
  const messages = React.useMemo(() => ({ ...dataGridMessagesEs, ...props.messages }), [props.messages]);
  const [initialRows] = React.useState(() => defaultValue ?? []);
  const rows = value ?? initialRows;
  const latest = React.useRef(props);
  latest.current = props;
  const warnedIds = React.useRef(new Set<string>());
  React.useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      const id = getRowId(row);
      if (ids.has(id) && !warnedIds.current.has(id)) {
        warnedIds.current.add(id);
        devWarn(`DataGrid: getRowId devolvió el id duplicado "${id}".`);
      }
      ids.add(id);
    }
  }, [rows, getRowId]);

  const { columnDefs, visibility, setVisibility } = useGridColumns({ columns, cellTypes, columnVisibility, onColumnVisibilityChange, persistKey, messages });
  const tableColumns = React.useMemo<ColumnDef<T, unknown>[]>(() => selectionMode === "none" ? columnDefs : [
    { id: "__select", size: 40, minSize: 40, enableSorting: false, enableHiding: false, enableResizing: false, enableColumnFilter: false }, ...columnDefs,
  ], [columnDefs, selectionMode]);
  const columnPinning = React.useMemo(() => ({
    left: [...(selectionMode !== "none" ? ["__select"] : []), ...columns.filter(c => c.frozen === "left").map(c => c.field)],
    right: columns.filter(c => c.frozen === "right").map(c => c.field),
  }), [columns, selectionMode]);
  const [sorting, setSorting] = React.useState<SortingState>(() => initialSort ? [{ id: initialSort.field, desc: initialSort.direction === "desc" }] : []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [paginationState, setPagination] = React.useState(() => ({
    pageIndex: 0,
    pageSize: pagination === false ? 10 : Math.max(1, pagination?.pageSize ?? 10),
  }));
  const [internalSelection, setInternalSelection] = React.useState<string[]>([]);
  const selectedIds = selection ?? internalSelection;
  const rowSelection = React.useMemo<RowSelectionState>(() => Object.fromEntries(selectedIds.map(id => [id, true])), [selectedIds]);
  const selectionRef = React.useRef(selectedIds);
  selectionRef.current = selectedIds;
  const updateSelection = React.useCallback((updater: Updater<RowSelectionState>) => {
    const before = Object.fromEntries(selectionRef.current.map(id => [id, true]));
    const next = typeof updater === "function" ? updater(before) : updater;
    const ids = Object.keys(next).filter(id => next[id]);
    if (latest.current.selection === undefined) setInternalSelection(ids);
    latest.current.onSelectionChange?.(ids);
  }, []);
  const table = useReactTable({
    data: rows, columns: tableColumns, getRowId,
    state: { columnVisibility: visibility, sorting, columnFilters, columnPinning, columnSizing, pagination: paginationState, rowSelection },
    onColumnVisibilityChange: setVisibility, onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters, onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination, onRowSelectionChange: updateSelection,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination === false ? undefined : getPaginationRowModel(),
    autoResetPageIndex: false, sortDescFirst: false, columnResizeMode: "onChange",
    enableRowSelection: selectionMode !== "none", enableMultiRowSelection: selectionMode === "multiple",
    defaultColumn: { enableResizing: false },
  });
  const pageCount = Math.max(1, table.getPageCount());
  React.useEffect(() => {
    setPagination(current => current.pageIndex >= pageCount ? { ...current, pageIndex: pageCount - 1 } : current);
  }, [pageCount]);

  const dataRef = React.useRef({ rows, selectedIds });
  dataRef.current = { rows, selectedIds };
  const grid = React.useMemo<DataGridHandle<T>>(() => ({ getData: () => ({ rows: dataRef.current.rows, selectedIds: [...dataRef.current.selectedIds] }) }), []);
  React.useImperativeHandle(ref, () => grid, [grid]);
  const radioName = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const headerElements = React.useRef(new Map<string, HTMLTableCellElement>());
  const [measuredWidths, setMeasuredWidths] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const updates: Record<string, number> = {};
      for (const entry of entries) {
        const field = (entry.target as HTMLElement).dataset.columnId;
        const width = entry.target.getBoundingClientRect().width;
        if (field && width > 0) updates[field] = width;
      }
      setMeasuredWidths(current => Object.keys(updates).some(field => current[field] !== updates[field]) ? { ...current, ...updates } : current);
    });
    headerElements.current.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [columns, visibility, selectionMode]);
  // LoadingOverlay cubre el puntero; inert bloquea también el teclado, incluso en celdas propias.
  React.useEffect(() => {
    if (loading) contentRef.current?.setAttribute("inert", "");
    else contentRef.current?.removeAttribute("inert");
  }, [loading]);

  // Mantener el orden visual de TanStack en todas las filas (también filtros y skeletons).
  const visibleColumns = [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
  const displayedRows = table.getRowModel().rows;
  const hasFilters = columnFilters.some(f => f.value !== "" && f.value != null);
  const hasFilterRow = visibleColumns.some(c => { const col = definition(c); return col && resolveFilterKind(col); });
  const totalRows = table.getFilteredRowModel().rows.length;
  const rowHeight = density === "compact" ? "h-(--ui-grid-row-height-compact)" : "h-(--ui-grid-row-height)";
  function columnWidth(column: Column<T, unknown>): number | string {
    const col = definition(column);
    return typeof col?.width === "string" && columnSizing[column.id] === undefined ? col.width : column.getSize();
  }
  function pinnedOffset(column: Column<T, unknown>, side: "left" | "right"): number | string {
    const pinned = side === "left" ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
    const position = pinned.findIndex(item => item.id === column.id);
    const before = side === "left" ? pinned.slice(0, position) : pinned.slice(position + 1);
    const widths = before.map(item => measuredWidths[item.id] ?? columnWidth(item));
    const pixels = widths.map(width => typeof width === "number" ? width : /^\d+(?:\.\d+)?px$/.test(width) ? Number.parseFloat(width) : null);
    if (pixels.every((width): width is number => width !== null)) return pixels.reduce((total, width) => total + width, 0);
    return `calc(${widths.map(width => typeof width === "number" ? `${width}px` : width).join(" + ")})`;
  }
  function cellStyle(column: Column<T, unknown>, header = false): React.CSSProperties {
    const col = definition(column);
    const pin = column.getIsPinned();
    const align = col?.align ?? (["number", "currency", "percent"].includes(col?.type ?? "") ? "right" : "left");
    const width = columnWidth(column);
    return {
      width, minWidth: col?.minWidth, textAlign: align,
      ...(pin ? { position: "sticky", [pin]: pinnedOffset(column, pin), zIndex: header ? 3 : 1 } : {}),
    };
  }
  function rowSelectionControl(id: string) {
    const checked = Boolean(rowSelection[id]);
    if (selectionMode === "single") return <input type="radio" name={radioName} aria-label={messages.selectRow} checked={checked} disabled={loading} onChange={() => updateSelection({ [id]: true })} />;
    return <CheckboxField label={messages.selectRow} classNames={{ label: "sr-only" }} checked={checked} disabled={loading} unstyled={unstyled} onCheckedChange={next => updateSelection(current => ({ ...current, [id]: next === true }))} />;
  }
  return <ReadCellStyleContext.Provider value={unstyled}><div data-slot="root" data-density={density} data-loading={loading || undefined} aria-busy={loading || undefined}
    className={cn(!unstyled && "relative font-(family-name:--ui-grid-font) text-ui-foreground", className, classNames?.root)} style={{ ...styles?.root, ...style }}>
    <div ref={contentRef}>
      <GridToolbar className={classNames?.toolbar} style={styles?.toolbar} unstyled={unstyled} toggler={columnToggler ? <ColumnToggler columns={columns} visibility={visibility} onToggle={(field, visible) => setVisibility(previous => ({ ...previous, [field]: visible }))} messages={messages} className={classNames?.columnToggler} style={styles?.columnToggler} unstyled={unstyled} disabled={loading} /> : undefined}>{toolbar}</GridToolbar>
      <div className={cn(!unstyled && "overflow-auto")} style={{ maxHeight, overflow: unstyled ? undefined : "auto" }}>
        <table data-slot="table" className={cn(!unstyled && "w-full border-separate border-spacing-0 text-sm", classNames?.table)} style={styles?.table}>
          <thead className={cn(!unstyled && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map(group => <tr key={group.id} data-slot="headerRow" className={cn(!unstyled && "bg-(--ui-grid-header-bg) text-(--ui-grid-header-fg)", classNames?.headerRow)} style={styles?.headerRow}>
              {group.headers.map(header => {
                const column = header.column;
                const col = definition(column);
                const sorted = column.getIsSorted();
                return <th key={header.id} scope="col" data-column-id={column.id} ref={element => { if (element) headerElements.current.set(column.id, element); else headerElements.current.delete(column.id); }} data-slot="headerCell" data-sorted={sorted || undefined} data-frozen={column.getIsPinned() || undefined} aria-sort={sorted ? sorted === "asc" ? "ascending" : "descending" : undefined}
                  className={cn(!unstyled && "relative border-b border-ui-border bg-(--ui-grid-header-bg) px-3 py-2 font-medium", classNames?.headerCell)} style={{ ...cellStyle(column, true), ...styles?.headerCell }}>
                  {column.id === "__select" ? selectionMode === "multiple" ? <CheckboxField label={messages.selectAll} classNames={{ label: "sr-only" }} disabled={loading} unstyled={unstyled}
                    checked={table.getIsAllPageRowsSelected() && displayedRows.length > 0 ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
                    onCheckedChange={next => { table.toggleAllPageRowsSelected(next === true); }} /> : <span className="sr-only">{messages.selectRow}</span> : col && (column.getCanSort() ? <button type="button" disabled={loading} aria-label={messages.sortLabel(col.header)} className={cn(!unstyled && "flex w-full items-center gap-1 text-inherit")} style={{ justifyContent: cellStyle(column).textAlign === "right" ? "flex-end" : cellStyle(column).textAlign === "center" ? "center" : undefined }} onClick={column.getToggleSortingHandler()}>
                      {col.headerContent ?? col.header}{sorted && <span aria-hidden="true">{sorted === "asc" ? "↑" : "↓"}</span>}
                    </button> : col.headerContent ?? col.header)}
                  {col?.resizable && <div role="separator" aria-orientation="vertical" aria-label={col.header} onMouseDown={loading ? undefined : header.getResizeHandler()} onTouchStart={loading ? undefined : header.getResizeHandler()} className={cn(!unstyled && "absolute inset-y-0 right-0 w-1 cursor-col-resize touch-none select-none")} />}
                </th>;
              })}
            </tr>)}
            {hasFilterRow && <tr data-slot="filterRow" className={cn(!unstyled && "bg-(--ui-grid-header-bg)", classNames?.filterRow)} style={styles?.filterRow}>
              {visibleColumns.map(column => { const col = definition(column); return <td key={column.id} data-slot="filterCell" data-frozen={column.getIsPinned() || undefined} className={cn(!unstyled && "border-b border-ui-border bg-(--ui-grid-header-bg) px-2 py-1", classNames?.filterCell)} style={{ ...cellStyle(column, true), ...styles?.filterCell }}>
                {col && <FilterCell column={col} value={column.getFilterValue()} onChange={next => column.setFilterValue(next)} messages={messages} classNames={classNames} unstyled={unstyled} disabled={loading} />}
              </td>; })}
            </tr>}
          </thead>
          <tbody data-slot="body" className={classNames?.body} style={styles?.body}>
            {loading && rows.length === 0 ? Array.from({ length: 5 }, (_, i) => <tr key={i} data-slot="skeleton" className={cn(!unstyled && rowHeight, classNames?.skeleton)} style={styles?.skeleton}>
              {visibleColumns.map(column => <td key={column.id} className={cn(!unstyled && "px-3 py-2")} style={cellStyle(column)}><Skeleton unstyled={unstyled} /></td>)}
            </tr>) : displayedRows.length === 0 ? <tr><td colSpan={Math.max(1, visibleColumns.length)} data-slot="empty" className={cn(!unstyled && "p-8 text-center", classNames?.empty)} style={styles?.empty}>
              {hasFilters ? messages.noResults : <>{emptyState?.icon}<div>{emptyState?.title ?? messages.emptyTitle}</div>{emptyState?.hint && <div>{emptyState.hint}</div>}</>}
            </td></tr> : displayedRows.map(row => <tr key={`${row.id}:${row.index}`} data-slot="row" data-selected={row.getIsSelected() || undefined} aria-selected={selectionMode === "none" ? undefined : row.getIsSelected() || undefined}
              className={cn(!unstyled && rowHeight, !unstyled && "[--ui-grid-current-row-bg:var(--ui-background)] even:[--ui-grid-current-row-bg:var(--ui-grid-row-alt)] hover:[--ui-grid-current-row-bg:var(--ui-grid-row-hover)] data-selected:[--ui-grid-current-row-bg:var(--ui-grid-row-selected)] bg-(--ui-grid-current-row-bg)", latest.current.getRowClassName?.(row.original), classNames?.row)} style={styles?.row}
              onClick={event => { if (loading || isInteractive(event)) return; if (selectionMode === "single") updateSelection({ [row.id]: true }); latest.current.onRowClick?.(row.original, event); }}
              onDoubleClick={event => { if (!loading && !isInteractive(event)) latest.current.onRowDoubleClick?.(row.original, event); }}>
              {row.getVisibleCells().map(cell => {
                const col = definition(cell.column);
                const type = col?.type ?? "text";
                const Cell = cellTypes?.[type] ?? readCellRegistry[type as keyof typeof readCellRegistry] ?? readCellRegistry.text;
                const align = col?.align ?? (["number", "currency", "percent"].includes(type) ? "right" : "left");
                return <td key={cell.id} data-slot="cell" data-align={align} data-frozen={cell.column.getIsPinned() || undefined}
                  className={cn(!unstyled && "border-b border-ui-border px-3 py-2", !unstyled && cell.column.getIsPinned() && "bg-ui-background", classNames?.cell)} style={{ ...cellStyle(cell.column), ...(!unstyled && cell.column.getIsPinned() ? { backgroundImage: "linear-gradient(var(--ui-grid-current-row-bg), var(--ui-grid-current-row-bg))" } : {}), ...styles?.cell }}>
                  {cell.column.id === "__select" ? rowSelectionControl(row.id) : col && <Cell column={col} row={row.original} value={cell.getValue()} rowId={row.id} grid={grid} />}
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>
      {pagination !== false && <div data-slot="footer" className={cn(!unstyled && "border-t border-ui-border px-3 py-2", classNames?.footer)} style={styles?.footer}>
        <GridPaginator table={table} totalRows={totalRows} pageSizeOptions={pagination?.pageSizeOptions ?? [10, 25, 50]} messages={messages} className={classNames?.paginator} style={styles?.paginator} unstyled={unstyled} disabled={loading} />
      </div>}
    </div>
    {loading && rows.length > 0 && <div data-slot="overlay" className={cn(!unstyled && "absolute inset-0 z-40", classNames?.overlay)} style={{ position: "absolute", inset: 0, ...styles?.overlay }}>
      <Progress label={messages.loading} size="sm" className={cn(!unstyled && "absolute inset-x-0 top-0 z-50")} unstyled={unstyled} />
      <LoadingOverlay open blocking target="container" message={messages.loading} indicator={null} unstyled={unstyled} />
    </div>}
  </div></ReadCellStyleContext.Provider>;
}

export const DataGrid = React.forwardRef(DataGridInner) as <T>(props: DataGridProps<T> & { ref?: React.Ref<DataGridHandle<T>> }) => React.ReactElement;
