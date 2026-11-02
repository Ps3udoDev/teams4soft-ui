import type * as React from "react";
import type { DialogSize } from "../../overlays/dialog/Dialog.types";
import type { FormFieldSharedProps } from "../../forms/form-field/FormField.types";
import type { DataGridColumn } from "../data-grid/DataGrid.types";
import type { EntityLookupMessages, LookupSearchContext, LookupSearchResponse } from "../lookup-core/lookup-core.types";

export type { EntityLookupMessages, LookupSearchContext, LookupSearchResponse };

export interface EntityFormContext<T> {
  open: boolean;
  onClose: () => void;
  /** Selects the item and closes everything. */
  onSaved: (item: T) => void;
  mode: "create" | "view";
  item: T | null;
}

export interface EntityLookupCriterion {
  value: string;
  label: string;
}

export interface EntityLookupFieldClassNames {
  root: string;
  control: string;
  input: string;
  clearButton: string;
  trigger: string;
  criteriaMenu: string;
  hint: string;
  dialog: string;
}

type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

export interface EntityLookupFieldProps<T>
  extends Pick<
      FormFieldSharedProps,
      "optional" | "reserveMessageSpace" | "orientation" | "labelWidth" | "requiredIndicator"
    >,
    DataAttributes {
  selectedItem: T | null;
  onSelectionChange(item: T | null): void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?(value: string): void;

  /** Local mode when there is no `search`. */
  items?: T[];
  search?(query: string, ctx: LookupSearchContext): Promise<LookupSearchResponse<T>>;
  getItemId(item: T): string | number;
  getItemLabel(item: T): string;
  /** Defaults to the `field` of every column. */
  searchKeys?: string[];
  matchItem?(text: string, item: T): boolean;

  columns: DataGridColumn<T>[];
  initialSort?: { field: string; direction: "asc" | "desc" };
  /** @default 50 */
  pageSize?: number;

  criteria?: EntityLookupCriterion[];
  criterion?: string;
  defaultCriterion?: string;
  onCriterionChange?(value: string): void;

  /** Remote mode only. @default true */
  autoSelectSingle?: boolean;
  resolveOnBlur?: boolean;
  onResolveNotFound?(text: string): void;
  onCreateRequest?(query: string): void;
  notFoundMessage?: React.ReactNode | ((query: string) => React.ReactNode);
  renderEntityForm?(ctx: EntityFormContext<T>): React.ReactNode;

  /** Replaces the search on the trigger button and Enter; Tab and blur never search. */
  onTriggerClick?(): void;
  trailingActions?: React.ReactNode;
  triggerIcon?: React.ReactNode;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  dialogTitle?: React.ReactNode;
  dialogSize?: DialogSize;
  tableMaxHeight?: string;

  clearable?: boolean;
  showSelectedHint?: boolean;
  /** Spinner on the trigger for local data that is still loading; disables nothing. */
  loading?: boolean;
  onSearchError?(error: unknown): void;
  messages?: Partial<EntityLookupMessages>;

  id?: string;
  name?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Names the input when there is no visible `label`. */
  "aria-label"?: string;
  "aria-describedby"?: string;

  className?: string;
  classNames?: Partial<EntityLookupFieldClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof EntityLookupFieldClassNames, React.CSSProperties>>;
}
