import * as React from "react";
import {
  useTable, type Column, type ColumnDef, type ColumnFiltersState,
  type ColumnSizingState, type RowData, type RowSelectionState, type SortingState, type Updater,
} from "@tanstack/react-table";
import { cn, devWarn, useClientLayoutEffect } from "../../lib";
import { CheckboxField } from "../../forms";
import { LoadingOverlay, Progress, Skeleton } from "../../feedback";
import { TooltipProvider } from "../../primitives";
import { gridFeatures, type GridFeatures } from "./table-features";
import { useGridColumns } from "./use-grid-columns";
import { useGridRows } from "./use-grid-rows";
import { useLoadingFocus } from "./use-loading-focus";
import { RemoteOptionsProvider, useCatalogLoading, useRemoteOptions } from "./use-remote-options";
import { definition, frozenSide, GridRow, type GridRowView } from "./GridRow";
import { focusCellElement, settleCellFocus, type CellFocusPlan } from "./cells/EditableCell";
import { editorFor } from "./cells/edit-cells";
import { ReadCellStyleContext } from "./cells/read-cells";
import { resolveFilterKind } from "./filters/filter-fns";
import { FilterMenu } from "./filters/FilterMenu";
import { GridPaginator } from "./pagination/GridPaginator";
import { ColumnToggler } from "./toolbar/ColumnToggler";
import { GridToolbar } from "./toolbar/GridToolbar";
import { dataGridMessagesEs } from "./messages";
import type { DataGridFilterValue, DataGridHandle, DataGridProps, DataGridQuery } from "./DataGrid.types";

const noColumns: never[] = [];
const noIds = new Set<string>();

function toRowSelection(ids: string[]): RowSelectionState {
  return Object.fromEntries(ids.map(id => [id, true as const]));
}

function DataGridInner<T extends RowData>(props: DataGridProps<T>, ref: React.ForwardedRef<DataGridHandle<T>>) {
  const {
    columns, getRowId, value, defaultValue, columnVisibility, onColumnVisibilityChange,
    onChange, onAddRow, readOnly = false, persistKey, columnToggler = true, selectionMode = "none", selection, onSelectionChange,
    pagination, serverSide, loading = false, toolbar, initialSort, density = "normal", maxHeight,
    emptyState, cellTypes, className, classNames, styles, style, unstyled = false,
  } = props;
  const messages = React.useMemo(() => ({ ...dataGridMessagesEs, ...props.messages }), [props.messages]);
  const [internalSelection, setInternalSelection] = React.useState<string[]>([]);
  const selectedIds = selection ?? internalSelection;
  const selectionRef = React.useRef(selectedIds);
  selectionRef.current = selectedIds;
  const server = serverSide !== undefined;
  // Un total ilegible no debe romper el paginador.
  const totalRecords = serverSide && Number.isFinite(serverSide.totalRecords) && serverSide.totalRecords > 0 ? serverSide.totalRecords : 0;
  const dropRows = React.useRef<(gone: (id: string) => boolean) => void>(() => {});
  const editing = !readOnly && columns.some(column => column.editable === true || typeof column.editable === "function");
  const { store, rows: storeRows, errors, revision, getData, reset: resetRows, patchRow, addRow: addStoreRow, removeRow: removeStoreRow, validate, markQueryEmitted, disarmFirstLoad, commitCell } = useGridRows<T>({ value, defaultValue, getRowId, onChange, columns: readOnly ? noColumns : columns, editing, messages, getSelectedIds: () => selectionRef.current, serverSide: server, onRowsGone: ids => dropRows.current(id => ids.has(id)) });
  // Las celdas, el orden y los filtros leen las columnas ya resueltas con las etiquetas del catálogo remoto.
  const remote = useRemoteOptions(columns);
  // TanStack memoiza orden y filtro por los datos: al llegar etiquetas hace falta una identidad nueva para recalcularlos.
  const rows = React.useMemo(() => remote.version === 0 ? storeRows : [...storeRows], [storeRows, remote.version]);
  const latest = React.useRef(props);
  useClientLayoutEffect(() => { latest.current = props; });
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
  const warnedEditors = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (readOnly) return;
    for (const column of columns) {
      const { field, editable, type = "text" } = column;
      if (!editable || cellTypes?.[type] || editorFor(column) || warnedEditors.current.has(field)) continue;
      warnedEditors.current.add(field);
      devWarn(`DataGrid: la columna "${field}" es editable pero el tipo "${type}" no tiene editor: se muestra en lectura y aun así se valida. Registra su celda en cellTypes.`);
    }
  }, [columns, cellTypes, readOnly]);

  const { columnDefs, visibility, setVisibility } = useGridColumns({ columns: remote.columns, cellTypes, columnVisibility, onColumnVisibilityChange, persistKey, messages });
  useCatalogLoading(remote.store, columns, visibility, storeRows);
  const remoteContext = React.useMemo(() => ({ store: remote.store, loadOptionsError: messages.loadOptionsError }), [remote.store, messages.loadOptionsError]);
  const tableColumns = React.useMemo<ColumnDef<GridFeatures, T, unknown>[]>(() => selectionMode === "none" ? columnDefs : [
    { id: "__select", size: 40, minSize: 40, enableSorting: false, enableHiding: false, enableResizing: false, enableColumnFilter: false }, ...columnDefs,
  ], [columnDefs, selectionMode]);
  const columnPinning = React.useMemo(() => ({
    start: [...(selectionMode !== "none" ? ["__select"] : []), ...columns.filter(c => c.frozen === "left").map(c => c.field)],
    end: columns.filter(c => c.frozen === "right").map(c => c.field),
  }), [columns, selectionMode]);
  const [sorting, setSorting] = React.useState<SortingState>(() => initialSort ? [{ id: initialSort.field, desc: initialSort.direction === "desc" }] : []);
  const [storedFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [paginationState, setPagination] = React.useState(() => ({
    pageIndex: 0,
    pageSize: pagination === false ? 10 : Math.max(1, pagination?.pageSize ?? 10),
  }));
  // Con servidor, orden y filtro cambian de página en el mismo lote: una sola consulta.
  const backToFirstPage = () => setPagination(current => current.pageIndex === 0 ? current : { ...current, pageIndex: 0 });
  // Sin su columna, un filtro ocultaría filas y no habría campo para limpiarlo.
  let columnFilters = storedFilters;
  const visibleFilters = storedFilters.filter(filter => visibility[filter.id] !== false);
  if (visibleFilters.length !== storedFilters.length) {
    columnFilters = visibleFilters;
    setColumnFilters(visibleFilters);
    if (server) backToFirstPage();
  }
  const filtersRef = React.useRef(columnFilters);
  filtersRef.current = columnFilters;
  const onSortingChange = React.useCallback((updater: Updater<SortingState>) => {
    setSorting(updater);
    if (latest.current.serverSide) setPagination(current => current.pageIndex === 0 ? current : { ...current, pageIndex: 0 });
  }, []);
  // Aplicar lo mismo, o limpiar sin filtro, no es un cambio: ni re-renderiza ni vuelve a la primera página.
  const onColumnFiltersChange = React.useCallback((updater: Updater<ColumnFiltersState>) => {
    const next = typeof updater === "function" ? updater(filtersRef.current) : updater;
    if (JSON.stringify(next) === JSON.stringify(filtersRef.current)) return;
    filtersRef.current = next;
    setColumnFilters(next);
    if (latest.current.serverSide) setPagination(current => current.pageIndex === 0 ? current : { ...current, pageIndex: 0 });
  }, []);
  const rowSelection = React.useMemo(() => toRowSelection(selectedIds), [selectedIds]);
  const updateSelection = React.useCallback((updater: Updater<RowSelectionState>) => {
    const next = typeof updater === "function" ? updater(toRowSelection(selectionRef.current)) : updater;
    const ids = Object.keys(next).filter(id => next[id]);
    // Antes del render: un onChange emitido a continuación ya debe ver esta selección.
    selectionRef.current = ids;
    if (latest.current.selection === undefined) setInternalSelection(ids);
    latest.current.onSelectionChange?.(ids);
  }, []);
  // No se filtra en getData(): las filas ocultas por un filtro, o de otra página en el servidor, siguen seleccionadas.
  const dropFromSelection = React.useCallback((gone: (id: string) => boolean) => {
    if (selectionRef.current.some(gone)) updateSelection(current => toRowSelection(Object.keys(current).filter(id => !gone(id))));
  }, [updateSelection]);
  dropRows.current = dropFromSelection;
  const removeRow = React.useCallback((id: string) => {
    if (store.getRow(id) !== undefined) dropFromSelection(selected => selected === id);
    removeStoreRow(id);
  }, [store, dropFromSelection, removeStoreRow]);
  const reset = React.useCallback((next: T[]) => {
    const kept = new Set(next.map(row => latest.current.getRowId(row)));
    dropFromSelection(selected => store.getRow(selected) !== undefined && !kept.has(selected));
    resetRows(next);
  }, [store, dropFromSelection, resetRows]);
  const table = useTable({
    features: gridFeatures, data: rows, columns: tableColumns, getRowId,
    state: { columnVisibility: visibility, sorting, columnFilters, columnPinning, columnSizing, pagination: paginationState, rowSelection },
    onColumnVisibilityChange: setVisibility, onSortingChange,
    onColumnFiltersChange, onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination, onRowSelectionChange: updateSelection,
    // Las features son estáticas: sin paginación, manualPagination deja pasar todas las filas.
    manualPagination: pagination === false || server, manualSorting: server, manualFiltering: server,
    rowCount: server ? totalRecords : undefined, autoResetPageIndex: false, sortDescFirst: false, columnResizeMode: "onChange",
    enableRowSelection: selectionMode !== "none", enableMultiRowSelection: selectionMode === "multiple",
    defaultColumn: { enableResizing: false },
  });
  const pageCount = Math.max(1, table.getPageCount());
  // Antes de pintar: si no, al quitar la última fila de la página se vería un fotograma del estado vacío.
  // Con servidor, un total que baja o un 0 transitorio no es motivo para saltar de página: solo se corrige
  // cuando ya no queda nada que mostrar (se borró la última fila de la última página).
  const emptyPastEnd = server && pagination !== false && !loading && rows.length === 0 && totalRecords > 0;
  useClientLayoutEffect(() => {
    if (server && !emptyPastEnd) return;
    setPagination(current => current.pageIndex >= pageCount ? { ...current, pageIndex: pageCount - 1 } : current);
  }, [pageCount, server, emptyPastEnd]);

  const radioName = React.useId();
  const contentRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  // La página y el foco se resuelven tras el render que ya tiene la fila nueva, sobre las filas filtradas y ordenadas.
  const jump = React.useRef<{ id: string; field?: string } | undefined>(undefined);
  const [, setJumpRequest] = React.useState(0);
  const requestJump = React.useCallback((id: string, field?: string) => {
    jump.current = { id, field };
    setJumpRequest(current => current + 1);
  }, []);
  const requestNewRow = React.useCallback(() => {
    disarmFirstLoad();
    latest.current.onAddRow?.();
  }, [disarmFirstLoad]);
  const addRow = React.useCallback((row?: T) => {
    if (row === undefined) {
      if (latest.current.onAddRow) requestNewRow();
      else devWarn("DataGrid: addRow() sin fila requiere la prop onAddRow.");
      return;
    }
    if (addStoreRow(row)) requestJump(latest.current.getRowId(row));
  }, [addStoreRow, requestJump, requestNewRow]);
  const focusCell = React.useCallback((id: string, field: string) => requestJump(id, field), [requestJump]);
  const grid = React.useMemo<DataGridHandle<T>>(() => ({ getData, reset, patchRow, addRow, removeRow, validate, focusCell }), [getData, reset, patchRow, addRow, removeRow, validate, focusCell]);
  React.useImperativeHandle(ref, () => grid, [grid]);
  useClientLayoutEffect(() => {
    const target = jump.current;
    const root = tableRef.current;
    if (!target || !root) return;
    const index = table.getPrePaginatedRowModel().rows.findIndex(item => item.id === target.id);
    if (index < 0) {
      jump.current = undefined;
      devWarn(`DataGrid: la fila "${target.id}" no está entre las filas visibles (filtro activo, otra página del servidor o id inexistente); no se cambia de página ni se enfoca.`);
      return;
    }
    // Con servidor los índices son locales a la página: no hay otra página que calcular.
    if (pagination !== false && !server) {
      const pageIndex = Math.floor(index / paginationState.pageSize);
      if (pageIndex !== paginationState.pageIndex) {
        setPagination(current => ({ ...current, pageIndex }));
        return;
      }
    }
    jump.current = undefined;
    if (target.field && !visibleColumns.some(column => column.id === target.field)) {
      devWarn(`DataGrid: focusCell no enfoca "${target.field}": la columna está oculta o no existe.`);
      return;
    }
    const field = target.field ?? Array.from(root.querySelectorAll<HTMLElement>("td[data-row-id]")).find(cell => cell.dataset.rowId === target.id)?.dataset.field;
    if (field) focusCellElement(root, target.id, field);
  });
  // El contador entra en el mismo lote que la confirmación: el efecto ve las filas ya movidas o filtradas,
  // también si la confirmación no cambió nada y no habría otro render.
  const focusPlan = React.useRef<CellFocusPlan | undefined>(undefined);
  const [focusRequest, setFocusRequest] = React.useState(0);
  const focusAfterEnter = React.useCallback((plan: CellFocusPlan) => {
    focusPlan.current = plan;
    setFocusRequest(current => current + 1);
  }, []);
  useClientLayoutEffect(() => {
    if (!focusPlan.current || !tableRef.current) return;
    settleCellFocus(tableRef.current, focusPlan.current);
    focusPlan.current = undefined;
  }, [focusRequest]);
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
  useLoadingFocus(loading, contentRef, messages.previousPage);

  // Mantener el orden visual de TanStack en todas las filas (también skeletons).
  const visibleColumns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const displayedRows = table.getRowModel().rows;
  const hasFilters = columnFilters.some(f => f.value !== "" && f.value != null);
  const totalRows = server ? totalRecords : table.getFilteredRowModel().rows.length;
  // Un solo efecto emite la consulta: compara por valor, así StrictMode, un onQueryChange nuevo o un total distinto no reemiten.
  const lastQuery = React.useRef<string | undefined>(undefined);
  const unpaged = pagination === false;
  const { pageIndex: queryPage, pageSize: queryPageSize } = paginationState;
  React.useEffect(() => {
    if (!server) {
      lastQuery.current = undefined;
      return;
    }
    const query: DataGridQuery = {
      pageIndex: unpaged ? 0 : queryPage,
      pageSize: queryPageSize,
      sorting: sorting.map(item => ({ field: item.id, desc: item.desc })),
      filters: Object.fromEntries(columnFilters.filter(item => item.value != null).map(item => [item.id, item.value as DataGridFilterValue])),
    };
    const key = JSON.stringify(query);
    if (key === lastQuery.current) return;
    lastQuery.current = key;
    markQueryEmitted();
    latest.current.serverSide?.onQueryChange(query);
  }, [server, unpaged, queryPage, queryPageSize, sorting, columnFilters, markQueryEmitted]);
  const warnedNoValue = React.useRef(false);
  React.useEffect(() => {
    if (!server || value !== undefined || warnedNoValue.current) return;
    warnedNoValue.current = true;
    devWarn("DataGrid: serverSide exige la prop value con la página actual; sin ella la grilla no recibe las filas del servidor.");
  }, [server, value]);
  const rowHeight = density === "compact" ? "h-(--ui-grid-row-height-compact)" : "h-(--ui-grid-row-height)";
  const dirtyIds = React.useMemo(() => editing ? new Set(store.getDiff().dirtyIds) : noIds, [editing, store, rows, revision]);
  const rowEvents = React.useMemo(() => ({
    selectRow: (id: string) => updateSelection({ [id]: true }),
    onRowClick: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => latest.current.onRowClick?.(row, event),
    onRowDoubleClick: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => latest.current.onRowDoubleClick?.(row, event),
  }), [updateSelection]);
  function columnWidth(column: Column<GridFeatures, T, unknown>): number | string {
    const col = definition(column);
    return typeof col?.width === "string" && columnSizing[column.id] === undefined ? col.width : column.getSize();
  }
  function pinnedOffset(column: Column<GridFeatures, T, unknown>, side: "left" | "right"): number | string {
    const pinned = side === "left" ? table.getStartVisibleLeafColumns() : table.getEndVisibleLeafColumns();
    const position = pinned.findIndex(item => item.id === column.id);
    const before = side === "left" ? pinned.slice(0, position) : pinned.slice(position + 1);
    const widths = before.map(item => measuredWidths[item.id] ?? columnWidth(item));
    const pixels = widths.map(width => typeof width === "number" ? width : /^\d+(?:\.\d+)?px$/.test(width) ? Number.parseFloat(width) : null);
    if (pixels.every((width): width is number => width !== null)) return pixels.reduce((total, width) => total + width, 0);
    return `calc(${widths.map(width => typeof width === "number" ? `${width}px` : width).join(" + ")})`;
  }
  function cellStyle(column: Column<GridFeatures, T, unknown>, header = false): React.CSSProperties {
    const col = definition(column);
    const side = frozenSide(column.getIsPinned());
    const align = col?.align ?? (["number", "currency", "percent"].includes(col?.type ?? "") ? "right" : "left");
    const width = columnWidth(column);
    return {
      width, minWidth: col?.minWidth, textAlign: align,
      ...(side ? { position: "sticky", [side]: pinnedOffset(column, side), zIndex: header ? 3 : 1 } : {}),
    };
  }
  function rowSelectionControl(id: string) {
    const checked = Boolean(rowSelection[id]);
    if (selectionMode === "single") return <input type="radio" name={radioName} aria-label={messages.selectRow} checked={checked} disabled={loading} onChange={() => updateSelection({ [id]: true })} />;
    return <CheckboxField label={messages.selectRow} classNames={{ label: "sr-only" }} checked={checked} disabled={loading} unstyled={unstyled} onCheckedChange={next => updateSelection(current => {
      const others = Object.keys(current).filter(key => key !== id);
      return toRowSelection(next === true ? [...others, id] : others);
    })} />;
  }
  const columnsKey = visibleColumns.map(column => column.id).join("|");
  const pinnedIds = new Set<string>([...columnPinning.start, ...columnPinning.end]);
  const pinnedWidths = Object.entries(measuredWidths).filter(([id]) => pinnedIds.has(id));
  const presentationKey = JSON.stringify([columnSizing, pinnedWidths, density, loading, readOnly, unstyled, selectionMode, revision, messages.selectRow, classNames?.row, classNames?.cell, classNames?.editor, styles?.row, styles?.cell, styles?.editor]);
  const rowView: GridRowView<T> = { store, grid, density, loading, readOnly, editing, unstyled, revision, selectionMode, classNames, styles, cellStyle, renderSelection: rowSelectionControl, commitCell, focusAfterEnter, ...rowEvents };
  return <RemoteOptionsProvider value={remoteContext}><ReadCellStyleContext.Provider value={unstyled}><TooltipProvider><div data-slot="root" data-density={density} data-loading={loading || undefined} aria-busy={loading || undefined}
    className={cn(!unstyled && "relative font-(family-name:--ui-grid-font) text-ui-foreground", className, classNames?.root)} style={{ ...styles?.root, ...style }}>
    <div ref={contentRef}>
      <GridToolbar addLabel={messages.addRow} onAdd={onAddRow && !readOnly ? requestNewRow : undefined} disabled={loading} className={classNames?.toolbar} style={styles?.toolbar} unstyled={unstyled} toggler={columnToggler ? <ColumnToggler columns={columns} visibility={visibility} onToggle={(field, visible) => setVisibility(previous => ({ ...previous, [field]: visible }))} messages={messages} className={classNames?.columnToggler} style={styles?.columnToggler} unstyled={unstyled} disabled={loading} /> : undefined}>{toolbar}</GridToolbar>
      <div className={cn(!unstyled && "overflow-auto")} style={{ maxHeight, overflow: unstyled ? undefined : "auto" }}>
        <table ref={tableRef} data-slot="table" role={editing ? "grid" : undefined} tabIndex={editing ? -1 : undefined} className={cn(!unstyled && "w-full border-separate border-spacing-0 text-sm", classNames?.table)} style={styles?.table}>
          <thead className={cn(!unstyled && "sticky top-0 z-10")}>
            {table.getHeaderGroups().map(group => <tr key={group.id} data-slot="headerRow" className={cn(!unstyled && "bg-(--ui-grid-header-bg) text-(--ui-grid-header-fg)", classNames?.headerRow)} style={styles?.headerRow}>
              {group.headers.map(header => {
                const column = header.column;
                const col = definition(column);
                const sorted = column.getIsSorted();
                return <th key={header.id} scope="col" data-column-id={column.id} ref={element => { if (element) headerElements.current.set(column.id, element); else headerElements.current.delete(column.id); }} data-slot="headerCell" data-sorted={sorted || undefined} data-frozen={frozenSide(column.getIsPinned())} aria-sort={sorted ? sorted === "asc" ? "ascending" : "descending" : undefined}
                  className={cn(!unstyled && "relative border-b border-ui-border bg-(--ui-grid-header-bg) px-3 py-2 font-medium", classNames?.headerCell)} style={{ ...cellStyle(column, true), ...styles?.headerCell }}>
                  <div className={cn(!unstyled && "flex items-center gap-1")}><div className={cn(!unstyled && "min-w-0 flex-1")}>{column.id === "__select" ? selectionMode === "multiple" ? <CheckboxField label={messages.selectAll} classNames={{ label: "sr-only" }} disabled={loading} unstyled={unstyled}
                    checked={table.getIsAllPageRowsSelected() && displayedRows.length > 0 ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
                    onCheckedChange={next => { table.toggleAllPageRowsSelected(next === true); }} /> : <span className="sr-only">{messages.selectRow}</span> : col && (column.getCanSort() ? <button type="button" disabled={loading} aria-label={messages.sortLabel(col.header)} className={cn(!unstyled && "flex w-full items-center gap-1 text-inherit")} style={{ justifyContent: cellStyle(column).textAlign === "right" ? "flex-end" : cellStyle(column).textAlign === "center" ? "center" : undefined }} onClick={column.getToggleSortingHandler()}>
                      {col.headerContent ?? col.header}{sorted && <span aria-hidden="true">{sorted === "asc" ? "↑" : "↓"}</span>}
                    </button> : col.headerContent ?? col.header)}</div>
                  {col && resolveFilterKind(col) && <FilterMenu column={col} value={column.getFilterValue() as DataGridFilterValue | undefined} onChange={next => column.setFilterValue(next)} messages={messages} className={classNames?.filterButton} style={styles?.filterButton} menuClassName={classNames?.filterMenu} menuStyle={styles?.filterMenu} unstyled={unstyled} disabled={loading} />}</div>
                  {col?.resizable && <div role="separator" aria-orientation="vertical" aria-label={col.header} onMouseDown={loading ? undefined : header.getResizeHandler()} onTouchStart={loading ? undefined : header.getResizeHandler()} className={cn(!unstyled && "absolute inset-y-0 right-0 w-1 cursor-col-resize touch-none select-none")} />}
                </th>;
              })}
            </tr>)}
          </thead>
          <tbody data-slot="body" className={classNames?.body} style={styles?.body}>
            {loading && rows.length === 0 ? Array.from({ length: 5 }, (_, i) => <tr key={i} data-slot="skeleton" className={cn(!unstyled && rowHeight, classNames?.skeleton)} style={styles?.skeleton}>
              {visibleColumns.map(column => <td key={column.id} className={cn(!unstyled && "px-3 py-2")} style={cellStyle(column)}><Skeleton unstyled={unstyled} /></td>)}
            </tr>) : displayedRows.length === 0 ? <tr><td colSpan={Math.max(1, visibleColumns.length)} data-slot="empty" className={cn(!unstyled && "p-8 text-center", classNames?.empty)} style={styles?.empty}>
              {hasFilters ? messages.noResults : <>{emptyState?.icon}<div>{emptyState?.title ?? messages.emptyTitle}</div>{emptyState?.hint && <div>{emptyState.hint}</div>}</>}
            </td></tr> : displayedRows.map(row => <GridRow key={row.id} row={row} isSelected={row.getIsSelected()} isDirty={dirtyIds.has(row.id)} errorsForRow={errors[row.id]} rowClassName={props.getRowClassName?.(row.original)} columnsKey={columnsKey} presentationKey={presentationKey} columns={remote.columns} cellTypes={cellTypes} view={rowView} />)}
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
  </div></TooltipProvider></ReadCellStyleContext.Provider></RemoteOptionsProvider>;
}

export const DataGrid = React.forwardRef(DataGridInner) as <T>(props: DataGridProps<T> & { ref?: React.Ref<DataGridHandle<T>> }) => React.ReactElement;
