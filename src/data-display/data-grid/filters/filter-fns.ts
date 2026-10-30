import { isValidIsoDate } from "../../../forms/date-field/date-utils";
import type { DataGridColumn, DataGridFilterKind } from "../DataGrid.types";
import { formatCellText } from "../format";

export function resolveFilterKind<T, O = unknown>(column: DataGridColumn<T, O>): DataGridFilterKind | null {
  if (column.filter === false) return null;
  if (typeof column.filter === "string") return column.filter;
  switch (column.type ?? "text") {
    case "text":
    case "lookup": return "text";
    case "number":
    case "currency":
    case "percent": return "number";
    case "date": return "date";
    case "select":
    case "radio":
    case "checkbox": return "select";
    default: return null;
  }
}

export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function matchesFilter<T, O = unknown>(column: DataGridColumn<T, O>, cellValue: unknown, filterValue: unknown): boolean {
  if (filterValue === "" || filterValue === null || filterValue === undefined) return true;
  switch (resolveFilterKind(column)) {
    case "text": return normalizeText(formatCellText(column, cellValue)).includes(normalizeText(String(filterValue)));
    case "number": {
      if (cellValue === null || cellValue === undefined || cellValue === "") return false;
      if ((typeof cellValue !== "number" && typeof cellValue !== "string") ||
          (typeof filterValue !== "number" && typeof filterValue !== "string")) return false;
      const cell = Number(cellValue);
      const filter = Number(filterValue);
      return Number.isFinite(cell) && Number.isFinite(filter) && cell === filter;
    }
    case "date": return typeof cellValue === "string" && isValidIsoDate(cellValue) && cellValue === filterValue;
    case "select": return Object.is(cellValue, filterValue);
    default: return true;
  }
}
