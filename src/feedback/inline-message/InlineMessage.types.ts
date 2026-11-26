import type * as React from "react";

export type InlineMessageTone = "info" | "success" | "warning" | "danger";

export interface InlineMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: InlineMessageTone;
  unstyled?: boolean;
}
