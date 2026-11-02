import { formatIso } from "../../forms/date-field/date-utils";
import { formatNumber } from "../../forms/number-field/number-utils";
import type { DataGridColumn } from "./DataGrid.types";
import { dataGridMessagesEs } from "./messages";

/** Texto de lectura compartido por celdas, tooltips y filtros. */
export function formatCellText<T, O = unknown>(
  column: DataGridColumn<T, O>,
  value: unknown,
  locale = "es-MX",
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && !Number.isFinite(value)) return "";
  if (value instanceof Date && Number.isNaN(value.getTime())) return "";

  switch (column.type) {
    case "number":
    case "currency":
    case "percent": {
      if (typeof value !== "number" && typeof value !== "string") return "";
      if (typeof value === "string" && value.trim() === "") return "";
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return "";
      const digits = column.fractionDigits ?? 2;
      return formatNumber(numericValue, {
        mode: column.type === "currency" ? "currency" : column.type === "percent" ? "percent" : "decimal",
        minFractionDigits: digits,
        maxFractionDigits: digits,
        currencySymbol: column.currencySymbol,
        locale,
      });
    }
    case "date":
      return typeof value === "string" ? formatIso(value, { displayFormat: "dd/MM/yyyy" }) : "";
    case "select":
    case "radio":
    case "lookup": {
      const option = column.options?.find((item) => Object.is(
        column.getOptionValue ? column.getOptionValue(item) : readOptionProperty(item, "value"),
        value,
      ));
      if (option !== undefined) {
        const label = column.getOptionLabel ? column.getOptionLabel(option) : readOptionProperty(option, "label");
        return label == null ? "" : String(label);
      }
      return String(value);
    }
    case "checkbox":
      return value ? dataGridMessagesEs.yes : dataGridMessagesEs.no;
    default:
      return String(value);
  }
}

function readOptionProperty(option: unknown, key: "value" | "label"): unknown {
  return typeof option === "object" && option !== null && key in option
    ? (option as Record<string, unknown>)[key]
    : undefined;
}
