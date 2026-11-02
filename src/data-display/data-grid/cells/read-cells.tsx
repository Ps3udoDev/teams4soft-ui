import * as React from "react";
import { CheckboxField } from "../../../forms";
import { formatCellText } from "../format";
import { isOptionsPending } from "../use-remote-options";
import type { DataGridCellComponent, DataGridColumnType } from "../DataGrid.types";

export const ReadCellStyleContext = React.createContext(false);

const TextCell: DataGridCellComponent<unknown> = ({ column, value, row }) => {
  const unstyled = React.useContext(ReadCellStyleContext);
  const text = formatCellText(column, value);
  // Mientras llega el catálogo remoto se muestra el valor crudo, nunca una celda vacía.
  const pending = (isOptionsPending(column) && value != null) || undefined;
  return <>{column.format?.(value, row) ?? <span title={text} data-pending={pending} className={unstyled ? undefined : "block truncate"}>{text}</span>}</>;
};
const CheckboxCell: DataGridCellComponent<unknown> = ({ column, value, row }) => {
  const unstyled = React.useContext(ReadCellStyleContext);
  const formatted = column.format?.(value, row);
  if (formatted != null) return <>{formatted}</>;
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return null;
  return <CheckboxField checked={value === true} disabled label={column.header} classNames={{ label: "sr-only" }} unstyled={unstyled} />;
};
const CustomCell: DataGridCellComponent<unknown> = ({ column, row, value, rowId, grid }) => <>{column.render?.({ row, value, rowId, grid }) ?? column.format?.(value, row)}</>;

// Componentes estables: el registro no crea tipos nuevos al renderizar la tabla.
export const readCellRegistry: Record<DataGridColumnType, DataGridCellComponent<any>> = {
  text: TextCell, number: TextCell, currency: TextCell, percent: TextCell,
  date: TextCell, select: TextCell, lookup: TextCell, radio: TextCell,
  checkbox: CheckboxCell, custom: CustomCell,
};
