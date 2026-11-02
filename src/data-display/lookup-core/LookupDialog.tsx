import * as React from "react";
import { cn } from "../../lib";
import { Dialog } from "../../overlays/dialog/Dialog";
import type { DialogClassNames, DialogSize } from "../../overlays/dialog/Dialog.types";
import { Button } from "../../primitives";
import { DataGrid } from "../data-grid/DataGrid";
import type { DataGridColumn, DataGridQuery, DataGridSort } from "../data-grid/DataGrid.types";
import type { EntityLookupMessages } from "./lookup-core.types";

export type LookupDialogClassNames = DialogClassNames & { grid: string };

export interface LookupDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  size?: DialogSize;
  tableMaxHeight?: number | string;
  columns: DataGridColumn<T>[];
  initialSort?: DataGridSort;
  rows: T[];
  /** Total reported by the server; only used when `remote`. */
  total: number | null;
  /** 1-based. */
  page: number;
  pageSize: number;
  loading: boolean;
  /** The server paginates: filters and sorting are off because the back end does not receive them. */
  remote: boolean;
  getItemId: (item: T) => string;
  preselectedId?: string | null;
  onConfirm: (item: T) => void;
  onPageChange: (page: number, pageSize: number) => void;
  /** Rendered before the Accept button; the function form receives the row currently selected in the dialog. */
  footerExtra?: React.ReactNode | ((ctx: { selectedItem: T | null }) => React.ReactNode);
  messages: Pick<EntityLookupMessages, "accept" | "dialogTitle">;
  classNames?: Partial<LookupDialogClassNames>;
}

const rowSelector = "tbody tr[data-slot='row']";
const interactiveInRow = "button, a, select, textarea, input:not([type='radio'])";

export function LookupDialog<T>({
  open, onOpenChange, title, size = "lg", tableMaxHeight, columns, initialSort, rows, total, page, pageSize, loading, remote,
  getItemId, preselectedId, onConfirm, onPageChange, footerExtra, messages, classNames,
}: LookupDialogProps<T>) {
  const [selectedId, setSelectedId] = React.useState<string | null>(preselectedId ?? null);
  const selectedRef = React.useRef(selectedId);
  // True after a mouse click on a row, until the next click elsewhere or focus reaches another control of the dialog.
  const rowClickedRef = React.useRef(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      const next = preselectedId ?? null;
      selectedRef.current = next;
      rowClickedRef.current = false;
      setSelectedId(next);
    }
  }
  const select = (id: string | null) => {
    selectedRef.current = id;
    setSelectedId(id);
  };

  // A server selection can belong to another page: only an item in the current rows can be confirmed.
  const selectedItem = selectedId === null ? null : rows.find(row => getItemId(row) === selectedId) ?? null;

  const { grid: gridClassName, ...dialogClassNames } = classNames ?? {};

  const latest = React.useRef({ rows, getItemId, onConfirm, onPageChange, page, pageSize, loading });
  latest.current = { rows, getItemId, onConfirm, onPageChange, page, pageSize, loading };

  const gridColumns = React.useMemo(
    () => remote ? columns.map(column => ({ ...column, sortable: false, filter: false })) : columns,
    [columns, remote],
  );
  const serverSide = React.useMemo(() => remote ? {
    totalRecords: total ?? rows.length,
    // The grid emits its initial query on mount; repeating the current page would search twice.
    onQueryChange: (query: DataGridQuery) => {
      const current = latest.current;
      if (query.pageIndex + 1 === current.page && query.pageSize === current.pageSize) return;
      current.onPageChange(query.pageIndex + 1, query.pageSize);
    },
  } : undefined, [remote, total, rows.length]);

  const confirmId = (id: string | null) => {
    if (id === null) return;
    const { rows: current, getItemId: idOf, onConfirm: confirm } = latest.current;
    const found = current.find(row => idOf(row) === id);
    if (found !== undefined) confirm(found);
  };

  // DataGrid rows only react to clicks; a keyboard user reaches a row through its radio.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented || loading) return;
    const target = event.target;
    // Portals (filter menu) bubble React events up to this wrapper without being inside it in the DOM.
    if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
    const row = target.closest(rowSelector);
    if (!row || target.closest(interactiveInRow)) return;
    const radio = row.querySelector<HTMLInputElement>("input[type='radio']");
    if (!radio) return;
    event.preventDefault();
    if (!radio.checked) radio.click();
    confirmId(selectedRef.current);
  };

  const confirmClickedRow = (event: { key: string; defaultPrevented: boolean; preventDefault: () => void }) => {
    if (event.key !== "Enter" || event.defaultPrevented || latest.current.loading || !rowClickedRef.current) return;
    event.preventDefault();
    confirmId(selectedRef.current);
  };

  // A click on a cell focuses the nearest focusable ancestor, the dialog content. Every other target keeps its own Enter.
  const onContentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) confirmClickedRow(event);
  };

  const onContentClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    rowClickedRef.current = !loading && target instanceof Element && event.currentTarget.contains(target)
      && target.closest(rowSelector) !== null && target.closest(interactiveInRow) === null;
  };

  const onContentFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) rowClickedRef.current = false;
  };

  // With focus on body the key never reaches the React handlers of the dialog.
  React.useEffect(() => {
    if (!open) return;
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.target === document.body) confirmClickedRow(event);
    };
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => document.removeEventListener("keydown", onDocumentKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the handler only reads refs
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title ?? messages.dialogTitle} size={size}
      onKeyDown={onContentKeyDown} onClickCapture={onContentClickCapture} onFocusCapture={onContentFocusCapture}
      classNames={{ ...dialogClassNames, body: cn("p-0", dialogClassNames.body) }}
      footer={<>
        {typeof footerExtra === "function" ? footerExtra({ selectedItem }) : footerExtra}
        <Button disabled={selectedItem === null} onClick={() => confirmId(selectedId)}>{messages.accept}</Button>
      </>}>
      <div onKeyDown={onKeyDown}>
        <DataGrid<T> columns={gridColumns} getRowId={getItemId} value={rows} readOnly selectionMode="single"
          selection={selectedId === null ? [] : [selectedId]} onSelectionChange={ids => select(ids[0] ?? null)}
          pagination={{ pageSize }} serverSide={serverSide} loading={loading} maxHeight={tableMaxHeight}
          initialSort={remote ? undefined : initialSort} columnToggler={false}
          onRowDoubleClick={row => confirmId(getItemId(row))} className={gridClassName} />
      </div>
    </Dialog>
  );
}
