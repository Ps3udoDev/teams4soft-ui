import { isValidIsoDate } from "../../forms/date-field/date-utils";
import type { DataGridColumn } from "./DataGrid.types";
import { formatCellText } from "./format";

const collator = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });

/** `undefined` marca una celda vacía: con `sortUndefined: "last"` queda al final en ambas direcciones. */
export function toSortValue<T, O = unknown>(column: DataGridColumn<T, O>, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return undefined;
  switch (column.type) {
    case "number":
    case "currency":
    case "percent": {
      if (typeof value !== "number" && typeof value !== "string") return undefined;
      if (typeof value === "string" && value.trim() === "") return undefined;
      return Number.isFinite(Number(value)) ? value : undefined;
    }
    case "date":
      return typeof value === "string" && isValidIsoDate(value) ? value : undefined;
    default:
      return typeof value === "number" && Number.isNaN(value) ? undefined : value;
  }
}

/** Compara valores no vacíos en orden ascendente, según lo que muestra cada tipo de columna. */
export function compareCellValues<T, O = unknown>(column: DataGridColumn<T, O>, a: unknown, b: unknown): number {
  switch (column.type) {
    case "number":
    case "currency":
    case "percent":
      return Number(a) - Number(b);
    case "date":
      return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
    case "checkbox":
      return Number(Boolean(a)) - Number(Boolean(b));
    case "select":
    case "radio":
    case "lookup":
      break;
    default:
      if (typeof a === "number" && typeof b === "number") return a - b;
  }
  return collator.compare(formatCellText(column, a), formatCellText(column, b));
}
