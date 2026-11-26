import * as React from "react";
import { cn } from "../../lib";
import type { StatusTagProps, StatusTagTone } from "./StatusTag.types";

const baseClassName =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const toneClassName: Record<StatusTagTone, string> = {
  neutral: "border-ui-border bg-ui-muted text-ui-foreground",
  info: "border-ui-info/30 bg-ui-info/10 text-ui-info",
  success: "border-ui-success/30 bg-ui-success/10 text-ui-success",
  warning: "border-ui-warning/30 bg-ui-warning/10 text-ui-warning",
  danger: "border-ui-danger/30 bg-ui-danger/10 text-ui-danger",
};

export const StatusTag = React.forwardRef<HTMLSpanElement, StatusTagProps>(
  ({ tone = "neutral", unstyled = false, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      data-slot="root"
      data-tone={tone}
      className={cn(!unstyled && baseClassName, !unstyled && toneClassName[tone], className)}
      {...rest}
    >
      {children}
    </span>
  ),
);

StatusTag.displayName = "StatusTag";
