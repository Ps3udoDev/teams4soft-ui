import type * as React from "react";
import type { Table } from "@tanstack/react-table";
import { cn } from "../../../lib";
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
  return <div data-slot="paginator" className={cn(!unstyled && "flex flex-wrap items-center justify-between gap-3 text-sm", className)} style={style}>
    <span>{messages.range(first, last, totalRows)}</span>
    <div className={cn(!unstyled && "flex flex-wrap items-center gap-2")}>
      <button type="button" aria-label={messages.firstPage} disabled={disabled || page <= 1} onClick={() => table.setPageIndex(0)}>«</button>
      <button type="button" aria-label={messages.previousPage} disabled={disabled || page <= 1} onClick={() => table.previousPage()}>‹</button>
      <span>{messages.pageOf(page, pages)}</span>
      <button type="button" aria-label={messages.nextPage} disabled={disabled || page >= pages} onClick={() => table.nextPage()}>›</button>
      <button type="button" aria-label={messages.lastPage} disabled={disabled || page >= pages} onClick={() => table.setPageIndex(pages - 1)}>»</button>
      <label>{messages.rowsPerPage} <select aria-label={messages.rowsPerPage} value={pageSize} disabled={disabled} onChange={e => { table.setPageSize(Number(e.target.value)); table.setPageIndex(0); }}>
        {sizes.map(size => <option key={size} value={size}>{size}</option>)}
      </select></label>
    </div>
  </div>;
}
