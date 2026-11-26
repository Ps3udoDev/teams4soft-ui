import type * as React from "react";

export type DividerOrientation = "horizontal" | "vertical";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: DividerOrientation;
  decorative?: boolean;
  unstyled?: boolean;
}
