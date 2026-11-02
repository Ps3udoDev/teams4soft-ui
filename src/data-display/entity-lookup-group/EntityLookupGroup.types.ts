import type { ReactNode } from "react";

export type LookupGroupField<T = unknown> = {
  key: string;
  param?: string;
  label?: ReactNode;
  searchable?: boolean;
  primary?: boolean;
  selectField?: string | string[];
  col?: 1 | 2 | 3 | 4;
  row?: 1 | 2 | 3 | 4;
  colSpan?: 1 | 2 | 3 | 4;
  placeholder?: string;
  description?: ReactNode;
  errorMessage?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  type?: string;
  /** Phantom: ties the field to the row type of its group; never set. */
  readonly __row?: T;
};

export type NormalizedField<T = unknown> = LookupGroupField<T> & {
  param: string;
  searchable: boolean;
  primary: boolean;
};
