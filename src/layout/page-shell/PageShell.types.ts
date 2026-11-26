import type * as React from "react";

export interface PageShellClassNames {
  root?: string;
  header?: string;
  headingGroup?: string;
  title?: string;
  subtitle?: string;
  actions?: string;
  content?: string;
}

export interface PageShellProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  headingLevel?: 1 | 2 | 3;
  classNames?: PageShellClassNames;
  styles?: Partial<Record<keyof PageShellClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
