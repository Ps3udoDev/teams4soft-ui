import * as React from "react";
import { Button, Tooltip, TooltipProvider } from "../../primitives";
import type { DataGridCellContext, DataGridColumn } from "./DataGrid.types";

export function textColumn<T>(field: keyof T & string, header: string, opts?: Partial<DataGridColumn<T>>): DataGridColumn<T> {
  return { field, header, type: "text", ...opts };
}

export function amountColumn<T>(field: keyof T & string, header: string, opts?: Partial<DataGridColumn<T>>): DataGridColumn<T> {
  return { field, header, type: "currency", fractionDigits: 2, align: "right", ...opts };
}

export function dateColumn<T>(field: keyof T & string, header: string, opts?: Partial<DataGridColumn<T>>): DataGridColumn<T> {
  return { field, header, type: "date", width: 120, ...opts };
}

export function selectColumn<T, O>(field: keyof T & string, header: string, opts: Partial<DataGridColumn<T, O>> & { options: O[] }): DataGridColumn<T, O> {
  return { field, header, type: "select", ...opts };
}

export interface DataGridAction<T> {
  icon?: React.ReactNode;
  label: string;
  onClick: (row: T, ctx: DataGridCellContext<T>) => void;
  hidden?: (row: T) => boolean;
}

/** Columna sintética por identidad. `opts.header` permite localizar "Acciones". */
export function actionsColumn<T>(actions: DataGridAction<T>[], opts?: Partial<DataGridColumn<T>>): DataGridColumn<T> {
  return {
    field: "__actions" as keyof T & string,
    header: "Acciones",
    type: "custom",
    sortable: false,
    filter: false,
    hideable: false,
    frozen: "right",
    render: (context) => (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {actions.filter((action) => !action.hidden?.(context.row)).map((action, index) => (
            <Tooltip key={index} content={action.label}>
              <Button size="icon" variant="ghost" aria-label={action.label} onClick={() => action.onClick(context.row, context)}>
                {action.icon ?? action.label}
              </Button>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    ),
    ...opts,
  };
}
