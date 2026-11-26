import type * as React from "react";

export type StatusTagTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTagTone;
  unstyled?: boolean;
}
