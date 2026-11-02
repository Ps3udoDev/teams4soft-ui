import type { DataGridColumn, DataGridMessages } from "./DataGrid.types";

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function isCellEditable<T>(column: DataGridColumn<T>, row: T): boolean {
  return typeof column.editable === "function" ? column.editable(row) : column.editable === true;
}

export function validateCell<T>(column: DataGridColumn<T>, value: unknown, row: T, messages: DataGridMessages): string | null {
  if (column.required && isEmptyValue(value)) return messages.required;
  return column.validate?.(value, row) ?? null;
}

export function validateRows<T>(rows: T[], columns: DataGridColumn<T>[], getRowId: (row: T) => string, messages: DataGridMessages): Record<string, Record<string, string>> {
  const errors: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const rowErrors: Record<string, string> = {};
    for (const column of columns) {
      if (!isCellEditable(column, row)) continue;
      const message = validateCell(column, (row as Record<string, unknown>)[column.field], row, messages);
      if (message) rowErrors[column.field] = message;
    }
    if (Object.keys(rowErrors).length > 0) errors[getRowId(row)] = rowErrors;
  }
  return errors;
}
