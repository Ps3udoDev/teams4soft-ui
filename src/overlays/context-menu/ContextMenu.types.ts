import type * as React from "react";

export interface ContextMenuItem {
  id: string;
  label: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

export interface ContextMenuClassNames {
  trigger?: string;
  content?: string;
  item?: string;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  triggerLabel?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  classNames?: ContextMenuClassNames;
  styles?: Partial<Record<keyof ContextMenuClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
