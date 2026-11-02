import { isValidIsoDate } from "../../../forms/date-field/date-utils";
import type { DataGridColumn, DataGridFilterKind, DataGridFilterOperator } from "../DataGrid.types";
import { formatCellText } from "../format";

const operatorsByKind: Record<DataGridFilterKind, readonly DataGridFilterOperator[]> = {
  text: ["contains", "notContains", "startsWith", "endsWith", "equals", "notEquals"],
  number: ["equals", "notEquals", "gt", "gte", "lt", "lte"],
  date: ["equals", "notEquals", "before", "after"],
  select: ["equals"],
};

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

export function filterOperatorsFor<T, O = unknown>(column: DataGridColumn<T, O>): readonly DataGridFilterOperator[] {
  const kind = resolveFilterKind(column);
  if (!kind) return [];
  return column.filterOperators?.length ? column.filterOperators : operatorsByKind[kind];
}

function matchesText(cell: string, filter: string, operator: DataGridFilterOperator): boolean {
  switch (operator) {
    case "notContains": return !cell.includes(filter);
    case "startsWith": return cell.startsWith(filter);
    case "endsWith": return cell.endsWith(filter);
    case "equals": return cell === filter;
    case "notEquals": return cell !== filter;
    default: return cell.includes(filter);
  }
}

function matchesNumber(cell: number, filter: number, operator: DataGridFilterOperator): boolean {
  switch (operator) {
    case "notEquals": return cell !== filter;
    case "gt": return cell > filter;
    case "gte": return cell >= filter;
    case "lt": return cell < filter;
    case "lte": return cell <= filter;
    default: return cell === filter;
  }
}

function matchesDate(cell: string, filter: unknown, operator: DataGridFilterOperator): boolean {
  if (typeof filter !== "string") return false;
  switch (operator) {
    case "notEquals": return cell !== filter;
    case "before": return cell < filter;
    case "after": return cell > filter;
    default: return cell === filter;
  }
}

export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function matchesFilter<T, O = unknown>(column: DataGridColumn<T, O>, cellValue: unknown, filterValue: unknown, operator: DataGridFilterOperator = filterOperatorsFor(column)[0] ?? "equals"): boolean {
  if (filterValue === "" || filterValue === null || filterValue === undefined) return true;
  switch (resolveFilterKind(column)) {
    case "text": return matchesText(normalizeText(formatCellText(column, cellValue)), normalizeText(String(filterValue)), operator);
    case "number": {
      // Una celda sin número válido no es comparable: solo cumple "distinto de".
      if (cellValue === null || cellValue === undefined || cellValue === "") return operator === "notEquals";
      if ((typeof cellValue !== "number" && typeof cellValue !== "string") ||
          (typeof filterValue !== "number" && typeof filterValue !== "string")) return false;
      const cell = Number(cellValue);
      const filter = Number(filterValue);
      return Number.isFinite(cell) && Number.isFinite(filter) && matchesNumber(cell, filter, operator);
    }
    case "date":
      if (typeof cellValue !== "string" || !isValidIsoDate(cellValue)) return operator === "notEquals";
      return matchesDate(cellValue, filterValue, operator);
    case "select": return operator === "notEquals" ? !Object.is(cellValue, filterValue) : Object.is(cellValue, filterValue);
    default: return true;
  }
}
