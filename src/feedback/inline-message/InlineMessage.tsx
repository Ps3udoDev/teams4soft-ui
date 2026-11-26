import * as React from "react";
import { cn } from "../../lib";
import type { InlineMessageProps, InlineMessageTone } from "./InlineMessage.types";

const baseClassName =
  "flex items-start gap-2 rounded-(--radius-ui-md) border px-3 py-2 text-sm";

const toneClassName: Record<InlineMessageTone, string> = {
  info: "border-ui-info/30 bg-ui-info/10 text-ui-info",
  success: "border-ui-success/30 bg-ui-success/10 text-ui-success",
  warning: "border-ui-warning/30 bg-ui-warning/10 text-ui-warning",
  danger: "border-ui-danger/30 bg-ui-danger/10 text-ui-danger",
};

export const InlineMessage = React.forwardRef<HTMLDivElement, InlineMessageProps>(
  ({ tone = "info", unstyled = false, className, role, children, ...rest }, ref) => {
    const resolvedRole = role ?? (tone === "danger" ? "alert" : "status");
    return (
      <div
        ref={ref}
        role={resolvedRole}
        aria-live={resolvedRole === "alert" ? "assertive" : "polite"}
        data-slot="root"
        data-tone={tone}
        className={cn(!unstyled && baseClassName, !unstyled && toneClassName[tone], className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

InlineMessage.displayName = "InlineMessage";
