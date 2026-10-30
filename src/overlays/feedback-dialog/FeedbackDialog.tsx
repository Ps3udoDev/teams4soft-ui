import * as React from "react";
import { cn } from "../../lib";
import { Button } from "../../primitives/button/Button";
import { Dialog } from "../dialog/Dialog";
import type { FeedbackDialogProps, FeedbackSeverity } from "./FeedbackDialog.types";

const severityClasses: Record<Exclude<FeedbackSeverity, "error">, string> = {
  info: "bg-ui-info/10 text-ui-info",
  warn: "bg-ui-warning/10 text-ui-warning",
  danger: "bg-ui-danger/10 text-ui-danger",
  success: "bg-ui-success/10 text-ui-success",
};

function SeverityIcon({ severity }: { severity: Exclude<FeedbackSeverity, "error"> }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" focusable="false">
      <circle cx="12" cy="12" r="9" />
      {severity === "success" ? <path d="m7 12 3 3 7-7" /> : severity === "danger" ? <path d="m8 8 8 8m0-8-8 8" /> : severity === "info" ? <path d="M12 11v6m0-10v1" /> : <path d="M12 7v7m0 2v1" />}
    </svg>
  );
}

/** Blocking confirmation or notice. A failed async accept leaves it open for retry. */
export const FeedbackDialog = React.forwardRef<HTMLDivElement, FeedbackDialogProps>(
  function FeedbackDialog({
    open, onOpenChange, variant = "confirm", severity = "warn", title,
    message, acceptLabel, rejectLabel, showReject = false, onAccept, onReject,
    icon, messages, className, classNames, style, styles, unstyled = false, ...rest
  }, ref) {
    const [accepting, setAccepting] = React.useState(false);
    const acceptingRef = React.useRef(false);
    const session = React.useRef(0);
    const acceptRef = React.useRef<HTMLButtonElement>(null);
    const rejectRef = React.useRef<HTMLButtonElement>(null);
    const messageId = React.useId();
    const tone = severity === "error" ? "danger" : severity;
    const hasReject = variant === "confirm" && showReject;

    React.useEffect(() => {
      session.current += 1;
      acceptingRef.current = false;
      setAccepting(false);
      return () => { session.current += 1; };
    }, [open]);

    const reject = () => {
      session.current += 1;
      acceptingRef.current = false;
      setAccepting(false);
      try { onReject?.(); } finally { onOpenChange?.(false); }
    };

    const accept = async () => {
      if (acceptingRef.current) return;
      acceptingRef.current = true;
      setAccepting(true);
      const activeSession = session.current;
      try {
        await onAccept?.();
        if (activeSession === session.current) onOpenChange?.(false);
      } catch {
        // The caller owns error reporting; preserve the dialog and allow retry.
      } finally {
        if (activeSession === session.current) {
          acceptingRef.current = false;
          setAccepting(false);
        }
      }
    };

    return (
      <Dialog
        {...rest}
        ref={ref}
        open={open}
        onOpenChange={(next) => { if (!next) reject(); }}
        role="alertdialog"
        aria-describedby={messageId}
        title={title ?? messages?.title ?? "Aviso"}
        width={variant === "notice" ? "36rem" : "30rem"}
        initialFocusRef={tone === "danger" && hasReject ? rejectRef : acceptRef}
        unstyled={unstyled}
        className={cn(className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        data-variant={variant}
        data-severity={tone}
        footer={
          <div className={cn(!unstyled && "flex justify-end gap-2", classNames?.footer)} style={styles?.footer}>
            {hasReject ? <Button ref={rejectRef} variant="outline" unstyled={unstyled} className={classNames?.rejectButton} style={styles?.rejectButton} onClick={reject}>{rejectLabel ?? messages?.reject ?? "Cancelar"}</Button> : null}
            <Button ref={acceptRef} variant="primary" loading={accepting} unstyled={unstyled} className={classNames?.acceptButton} style={styles?.acceptButton} onClick={() => { void accept(); }}>{acceptLabel ?? messages?.accept ?? "Aceptar"}</Button>
          </div>
        }
      >
        <div className={cn(!unstyled && "flex items-center gap-4 p-6")}>
          <span aria-hidden="true" className={cn(!unstyled && "flex shrink-0 items-center justify-center", !unstyled && severityClasses[tone], !unstyled && (variant === "notice" ? "h-20 w-[15%] bg-transparent" : "h-11 w-11 rounded-full p-2"), classNames?.icon)} style={styles?.icon}>
            {icon ?? <SeverityIcon severity={tone} />}
          </span>
          <div id={messageId} className={cn(!unstyled && "min-w-0 whitespace-pre-line text-sm", classNames?.message)} style={styles?.message}>{message}</div>
        </div>
      </Dialog>
    );
  },
);

FeedbackDialog.displayName = "FeedbackDialog";
