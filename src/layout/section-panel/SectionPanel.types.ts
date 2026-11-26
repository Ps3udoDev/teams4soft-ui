import type * as React from "react";

export interface SectionPanelClassNames {
  root?: string;
  header?: string;
  trigger?: string;
  title?: string;
  description?: string;
  actions?: string;
  content?: string;
}

export interface SectionPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  headingLevel?: 2 | 3 | 4;
  classNames?: SectionPanelClassNames;
  styles?: Partial<Record<keyof SectionPanelClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
