import type * as React from "react";

export type DataGridColumnType = "text" | "number" | "currency" | "percent" | "date" | "select" | "lookup" | "checkbox" | "radio" | "custom";
export type DataGridFilterKind = "text" | "select" | "number" | "date";
export type DataGridSelectionMode = "none" | "single" | "multiple";
export type DataGridDensity = "compact" | "normal";
export type DataGridSort = { field: string; direction: "asc" | "desc" };
export type DataGridPagination = { pageSize?: number; pageSizeOptions?: number[] } | false;
export type DataGridData<T> = { rows: T[]; selectedIds: string[] };
export type DataGridHandle<T> = { getData(): DataGridData<T> };
export type DataGridCellContext<T> = { row: T; value: unknown; rowId: string; grid: DataGridHandle<T> };
export type DataGridCellComponent<T> = React.ComponentType<DataGridCellContext<T> & { column: DataGridColumn<T> }>;

export interface DataGridColumn<T, TOption = unknown> {
  field: keyof T & string;
  header: string;
  headerContent?: React.ReactNode;
  type?: DataGridColumnType | (string & {});
  width?: number | string;
  minWidth?: number;
  resizable?: boolean;
  align?: "left" | "center" | "right";
  frozen?: "left" | "right";
  hidden?: boolean;
  hideable?: boolean;
  sortable?: boolean;
  filter?: boolean | DataGridFilterKind;
  format?: (value: unknown, row: T) => React.ReactNode;
  fractionDigits?: number;
  currencySymbol?: string;
  options?: readonly TOption[];
  getOptionValue?(option: TOption): unknown;
  getOptionLabel?(option: TOption): string;
  render?: (ctx: DataGridCellContext<T>) => React.ReactNode;
}

export interface DataGridClassNames {
  root: string;
  toolbar: string;
  table: string;
  headerRow: string;
  headerCell: string;
  filterRow: string;
  filterCell: string;
  body: string;
  row: string;
  cell: string;
  editor: string;
  footer: string;
  paginator: string;
  empty: string;
  skeleton: string;
  overlay: string;
  columnToggler: string;
}

export interface DataGridMessages {
  emptyTitle: string;
  noResults: string;
  columns: string;
  filterLabel: (header: string) => string;
  sortLabel: (header: string) => string;
  selectAll: string;
  selectRow: string;
  pageOf: (page: number, total: number) => string;
  range: (first: number, last: number, total: number) => string;
  rowsPerPage: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  loading: string;
  yes: string;
  no: string;
  addRow: string;
}

export type DataGridEmptyState = { icon?: React.ReactNode; title?: React.ReactNode; hint?: React.ReactNode };

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  value?: T[];
  defaultValue?: T[];
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  columnToggler?: boolean;
  persistKey?: string;
  selectionMode?: DataGridSelectionMode;
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pagination?: DataGridPagination;
  loading?: boolean;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  onRowDoubleClick?: (row: T, event: React.MouseEvent<HTMLTableRowElement>) => void;
  getRowClassName?: (row: T) => string | undefined;
  initialSort?: DataGridSort;
  density?: DataGridDensity;
  maxHeight?: number | string;
  emptyState?: DataGridEmptyState;
  messages?: Partial<DataGridMessages>;
  cellTypes?: Record<string, DataGridCellComponent<T>>;
  className?: string;
  classNames?: Partial<DataGridClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof DataGridClassNames, React.CSSProperties>>;
}
