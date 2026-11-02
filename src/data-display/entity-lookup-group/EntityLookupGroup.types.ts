import type * as React from "react";
import type { DialogSize } from "../../overlays/dialog/Dialog.types";
import type { DataGridColumn } from "../data-grid/DataGrid.types";
import type { EntityLookupMessages, LookupSearchContext, LookupSearchResponse } from "../lookup-core/lookup-core.types";

export type LookupGroupField = {
  key: string;
  /** Name sent to `search`; defaults to `key`. */
  param?: string;
  label?: React.ReactNode;
  /** Its value travels in the params and Enter searches from it. @default true */
  searchable?: boolean;
  /** Carries the trigger button; one only. Defaults to the last field. */
  primary?: boolean;
  /** Path(s) in the chosen row that fill this field; a list takes the first non-empty. */
  selectField?: string | string[];
  col?: 1 | 2 | 3 | 4;
  row?: 1 | 2 | 3 | 4;
  colSpan?: 1 | 2 | 3 | 4;
  placeholder?: string;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  type?: string;
};

export type NormalizedField = LookupGroupField & {
  param: string;
  searchable: boolean;
  primary: boolean;
};

export interface LookupGroupParamsContext {
  fields: readonly NormalizedField[];
  values: Record<string, string>;
  /** Text of the field that started the search; for the trigger, the first filled searchable field. */
  term: string;
  searchParam: string;
}

export interface LookupGroupLabelContext {
  fields: readonly NormalizedField[];
  values: Record<string, string>;
  term: string;
}

export interface EntityLookupGroupClassNames {
  root: string;
  grid: string;
  field: string;
  trigger: string;
  dialog: string;
}

type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

export interface EntityLookupGroupProps<T> extends DataAttributes {
  fields: LookupGroupField[];
  values: Record<string, string>;
  onValuesChange(next: Record<string, string>, changedKey?: string): void;
  search(params: Record<string, string>, ctx: LookupSearchContext): Promise<LookupSearchResponse<T>>;
  onSelectionChange?(item: T | null): void;
  getItemId(item: T): string | number;
  columns: DataGridColumn<T>[];
  initialSort?: { field: string; direction: "asc" | "desc" };

  /** Param that carries the generic term while the capture is incomplete. @default "search" */
  searchParam?: string;
  buildParams?(ctx: LookupGroupParamsContext): Record<string, string>;
  getSearchLabel?(ctx: LookupGroupLabelContext): string;

  /** @default 50 */
  pageSize?: number;
  /** Columns from `md` up; one column below. @default 2 */
  gridColumns?: 1 | 2 | 3 | 4;

  onCreateRequest?(label: string): void;
  notFoundMessage?: React.ReactNode | ((label: string) => React.ReactNode);
  onSearchError?(error: unknown): void;
  messages?: Partial<EntityLookupMessages>;

  dialogTitle?: React.ReactNode;
  dialogSize?: DialogSize;
  tableMaxHeight?: string;

  id?: string;
  className?: string;
  classNames?: Partial<EntityLookupGroupClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof EntityLookupGroupClassNames, React.CSSProperties>>;
}
