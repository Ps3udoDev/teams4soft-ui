import type * as React from "react";
import type { Table } from "@tanstack/react-table";
import { cn } from "../../../lib";
import { Button } from "../../../primitives";
import type { DataGridMessages } from "../DataGrid.types";

export interface GridPaginatorProps<T> {
  table: Table<T>;
  totalRows: number;
  pageSizeOptions: number[];
  messages: DataGridMessages;
  className?: string;
  style?: React.CSSProperties;
  unstyled?: boolean;
  disabled?: boolean;
}

export function GridPaginator<T>({ table, totalRows, pageSizeOptions, messages, className, style, unstyled, disabled }: GridPaginatorProps<T>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pages = Math.max(1, table.getPageCount());
  const page = Math.min(pageIndex + 1, pages);
  const first = totalRows ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, totalRows);
  const sizes = [...new Set([...pageSizeOptions.filter(n => n > 0), pageSize])];
  const navButton = (label: string, glyph: string, blocked: boolean, onClick: () => void) => (
    <Button type="button" variant="ghost" size="sm" aria-label={label} className={cn(!unstyled && "w-8 px-0")} unstyled={unstyled} disabled={disabled || blocked} onClick={onClick}>{glyph}</Button>
  );
  return <div data-slot="paginator" className={cn(!unstyled && "flex flex-wrap items-center justify-between gap-3 text-sm", className)} style={style}>
    <span>{messages.range(first, last, totalRows)}</span>
    <div className={cn(!unstyled && "flex flex-wrap items-center gap-2")}>
      {navButton(messages.firstPage, "«", page <= 1, () => table.setPageIndex(0))}
      {navButton(messages.previousPage, "‹", page <= 1, () => table.previousPage())}
      <span>{messages.pageOf(page, pages)}</span>
      {navButton(messages.nextPage, "›", page >= pages, () => table.nextPage())}
      {navButton(messages.lastPage, "»", page >= pages, () => table.setPageIndex(pages - 1))}
      <label>{messages.rowsPerPage} <select aria-label={messages.rowsPerPage} className={cn(!unstyled && "h-8 rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus")} value={pageSize} disabled={disabled} onChange={e => { table.setPageSize(Number(e.target.value)); table.setPageIndex(0); }}>
        {sizes.map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>
    </div>
  </div>;
}
