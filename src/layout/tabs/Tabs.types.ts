import type * as React from "react";

export type TabsOrientation = "horizontal" | "vertical";

export interface TabItem {
  value: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsClassNames {
  root?: string;
  list?: string;
  tab?: string;
  panel?: string;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  /** Mantiene los paneles montados (ocultos con `hidden`) para conservar el estado capturado al cambiar de pestaña. */
  keepMounted?: boolean;
  classNames?: TabsClassNames;
  styles?: Partial<Record<keyof TabsClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
