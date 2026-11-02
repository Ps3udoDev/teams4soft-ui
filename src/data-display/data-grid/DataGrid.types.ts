import type * as React from "react";
import type { GridChange } from "./grid-rows-store";

export type DataGridColumnType = "text" | "number" | "currency" | "percent" | "date" | "select" | "lookup" | "checkbox" | "radio" | "custom";
export type DataGridFilterKind = "text" | "select" | "number" | "date";
export type DataGridFilterOperator = "contains" | "notContains" | "startsWith" | "endsWith" | "equals" | "notEquals" | "gt" | "gte" | "lt" | "lte" | "before" | "after";
export type DataGridFilterValue = { operator: DataGridFilterOperator; value: unknown };
export type DataGridSelectionMode = "none" | "single" | "multiple";
export type DataGridDensity = "compact" | "normal";
export type DataGridSort = { field: string; direction: "asc" | "desc" };
export type DataGridPagination = { pageSize?: number; pageSizeOptions?: number[] } | false;
export type DataGridData<T> = {
  rows: T[];
  selectedIds: string[];
  dirtyIds: string[];
  addedIds: string[];
  removedIds: string[];
  errors: Record<string, Record<string, string>>;
  isValid: boolean;
};
export type DataGridHandle<T> = {
  getData(): DataGridData<T>;
  reset(rows: T[]): void;
  patchRow(id: string, partial: Partial<T>): void;
  /** Sin `row` solo es válido con `onAddRow`, que es quien crea la fila. */
  addRow(row?: T): void;
  removeRow(id: string): void;
  /** Pinta los errores de todas las celdas editables y devuelve `isValid`. */
  validate(): boolean;
  /** Cambia de página si hace falta y enfoca la celda; no limpia filtros. */
  focusCell(id: string, field: string): void;
};
export type DataGridCellContext<T> = { row: T; value: unknown; rowId: string; grid: DataGridHandle<T> };
/** `onCommit` escribe el valor de la celda por `rowId`; `editable` indica si la columna admite edición en esta fila. */
export type DataGridCellComponent<T> = React.ComponentType<DataGridCellContext<T> & { column: DataGridColumn<T>; onCommit: (value: unknown) => void; editable: boolean }>;

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
  /** Limita las condiciones del menú de filtro; la primera es la inicial y con una sola se oculta el selector. */
  filterOperators?: readonly DataGridFilterOperator[];
  format?: (value: unknown, row: T) => React.ReactNode;
  fractionDigits?: number;
  currencySymbol?: string;
  options?: readonly TOption[];
  getOptionValue?(option: TOption): unknown;
  getOptionLabel?(option: TOption): string;
  render?: (ctx: DataGridCellContext<T>) => React.ReactNode;
  editable?: boolean | ((row: T) => boolean);
  /** Props que se pasan tal cual al editor interno; la celda conserva `value`, `onCommit`/`onValueChange` y `aria-label`. */
  editorProps?: Record<string, unknown>;
  required?: boolean;
  validate?: (value: unknown, row: T) => string | null;
  onCommit?: (ctx: { row: T; value: unknown; prev: unknown; grid: DataGridHandle<T> }) => void;
}

export interface DataGridClassNames {
  root: string;
  toolbar: string;
  table: string;
  headerRow: string;
  headerCell: string;
  filterButton: string;
  filterMenu: string;
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
  filterActiveLabel: (header: string) => string;
  filterOperator: string;
  filterOperators: Record<DataGridFilterOperator, string>;
  filterApply: string;
  filterClear: string;
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
  required: string;
}

export type DataGridEmptyState = { icon?: React.ReactNode; title?: React.ReactNode; hint?: React.ReactNode };

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  /**
   * Filas en modo controlado. Mientras la grilla esté intacta y vacía, el primer `value` no vacío se adopta
   * como base sin emitir `onChange`: una carga asíncrona (`[]` y luego las filas) empieza con el diff vacío.
   * Las recargas posteriores se hacen con `ref.reset(rows)`.
   * Un arreglo antiguo que la grilla ya emitió se ignora; para revertir, usar `ref.reset(rows)`.
   * Un padre que ignora `onChange` conserva la edición hasta que `value` cambie de identidad.
   * `columns` y `cellTypes` deben ser estables (constante de módulo o `useMemo`), o se re-renderizan todas las filas.
   */
  value?: T[];
  defaultValue?: T[];
  onChange?: (data: DataGridData<T>, change: GridChange) => void;
  /** Botón de la barra y destino de `ref.addRow()` sin argumento: crea la fila quien lo recibe. */
  onAddRow?: () => void;
  /** `true` fuerza consulta aunque haya columnas editables. */
  readOnly?: boolean;
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
