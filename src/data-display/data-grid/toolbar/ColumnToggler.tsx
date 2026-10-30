import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { CheckboxField } from "../../../forms";
import { Button } from "../../../primitives";
import { cn } from "../../../lib";
import type { DataGridColumn, DataGridMessages } from "../DataGrid.types";

export interface ColumnTogglerProps<T> {
  columns: DataGridColumn<T>[];
  visibility: Record<string, boolean>;
  onToggle: (field: string, visible: boolean) => void;
  messages: DataGridMessages;
  className?: string;
  style?: React.CSSProperties;
  unstyled?: boolean;
  disabled?: boolean;
}

/** Selector controlado: la persistencia pertenece a useGridColumns. */
export function ColumnToggler<T>({ columns, visibility, onToggle, messages, className, style, unstyled = false, disabled = false }: ColumnTogglerProps<T>) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return (
    <div data-slot="columnToggler" className={className} style={style}>
      <Popover.Root open={disabled ? false : open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button variant="outline" size="sm" unstyled={unstyled} disabled={disabled}>{messages.columns}</Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            aria-label={messages.columns}
            align="end"
            sideOffset={4}
            className={cn(!unstyled && "z-50 grid max-h-80 min-w-48 gap-2 overflow-auto rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-3 text-ui-foreground shadow-md")}
          >
            {columns.filter((column) => column.hideable !== false).map((column) => (
              <CheckboxField
                key={column.field}
                label={column.header}
                checked={visibility[column.field] !== false}
                onCheckedChange={(checked) => onToggle(column.field, checked === true)}
                unstyled={unstyled}
                disabled={disabled}
              />
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
