import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib";
import { LoadingOverlay } from "../../feedback/loading-overlay/LoadingOverlay";
import type { DialogClassNames, DialogProps, DialogSize } from "./Dialog.types";

const widths: Record<Exclude<DialogSize, "full">, string> = {
  sm: "500px", md: "700px", lg: "1000px", xl: "1200px",
};
const EXIT_MS = 150;
const focusable = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function focusIfAvailable(target: HTMLElement | null | undefined): boolean {
  if (!target || target.matches(":disabled") || target.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  for (let node: HTMLElement | null = target; node; node = node.parentElement) {
    const computed = getComputedStyle(node);
    if (computed.display === "none" || computed.visibility === "hidden" || computed.visibility === "collapse") return false;
  }
  target.focus();
  return document.activeElement === target;
}

/** Controlled dialog. Radix owns the layer stack, focus trap and portal. */
export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(function Dialog({
  open, onOpenChange, onHide, title, description, icon, footer, children,
  size, width, modal = true, closable = true, closeOnOverlayClick = false,
  loading = false, loadingMessage, initialFocusRef, mobileVariant = "fullscreen",
  hideMode = "immediate", messages = { close: "Cerrar" },
  className, classNames, styles, style, unstyled = false, ...props
}, ref) {
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const bodyRef = React.useRef<HTMLDivElement | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [exiting, setExiting] = React.useState(false);
  // Support the legacy onHide-only contract, while onOpenChange users retain
  // control over whether a close request is accepted.
  const [locallyClosed, setLocallyClosed] = React.useState(false);
  const active = open && !locallyClosed;
  const [previousActive, setPreviousActive] = React.useState(active);
  const lastActive = React.useRef(active);
  const hideNotified = React.useRef(false);
  const onHideRef = React.useRef(onHide);
  onHideRef.current = onHide;

  // Retain the same content on the very render that observes an external
  // close. Waiting for an effect would already have unmounted the portal.
  if (previousActive !== active) {
    setPreviousActive(active);
    setExiting(!active && hideMode === "after-animation");
  }

  React.useEffect(() => () => clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (active) {
      clearTimeout(timer.current);
      hideNotified.current = false;
    } else if (lastActive.current) {
      if (hideMode === "after-animation") {
        timer.current = setTimeout(() => {
          setExiting(false);
          if (!hideNotified.current) {
            hideNotified.current = true;
            onHideRef.current?.();
          }
        }, EXIT_MS);
      } else if (!hideNotified.current) {
        hideNotified.current = true;
        onHideRef.current?.();
      }
    }
    lastActive.current = active;
  }, [active, hideMode]);
  React.useEffect(() => {
    if (!open) setLocallyClosed(false);
  }, [open]);

  function requestClose() {
    if (!onOpenChange && onHide) setLocallyClosed(true);
    onOpenChange?.(false);
    if (hideMode === "immediate" && !hideNotified.current) {
      hideNotified.current = true;
      onHide?.();
    }
  }

  function slot(name: keyof DialogClassNames, base: string) {
    return cn(!unstyled && base, classNames?.[name]);
  }

  return (
    <DialogPrimitive.Root open={active} modal={modal} onOpenChange={(next) => {
      if (next) onOpenChange?.(true);
      else requestClose();
    }}>
      <DialogPrimitive.Portal forceMount={exiting || undefined}>
        <DialogPrimitive.Overlay
          forceMount={exiting || undefined}
          className={slot("overlay", "fixed inset-0 z-50 bg-(--ui-overlay) transition-opacity duration-150 data-[state=closed]:opacity-0 motion-reduce:transition-none")}
          style={styles?.overlay}
        />
        <DialogPrimitive.Content
          {...props}
          forceMount={exiting || undefined}
          ref={ref}
          {...(description == null && props["aria-describedby"] === undefined ? { "aria-describedby": undefined } : {})}
          className={cn(slot("content", "fixed top-1/2 left-1/2 z-50 flex max-h-[95dvh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-(--ui-radius-lg) bg-ui-background text-ui-foreground shadow-(--ui-shadow-lg) transition-opacity duration-150 data-[state=closed]:opacity-0 motion-reduce:transition-none"),
            !unstyled && size === "full" && "h-dvh max-h-dvh rounded-none",
            !unstyled && (mobileVariant === "sheet"
              ? "max-sm:top-auto max-sm:bottom-0 max-sm:w-full! max-sm:max-w-full! max-sm:translate-y-0 max-sm:rounded-b-none"
              : "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full! max-sm:max-w-full! max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none"), className)}
          style={{ width: width ?? (size === "full" ? "100vw" : size ? widths[size] : "400px"), maxWidth: size === "full" ? "100vw" : "95vw", ...styles?.content, ...style }}
          onOpenAutoFocus={(event) => {
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            const focused = focusIfAvailable(initialFocusRef?.current) ||
              Array.from(bodyRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []).some(focusIfAvailable);
            // Leave Radix's normal fallback intact if no body candidate can
            // actually take focus (for example, a hidden or inert region).
            if (focused) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => { if (!closable) event.preventDefault(); }}
          onPointerDownOutside={(event) => {
            if (!closeOnOverlayClick || !closable) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!closeOnOverlayClick || !closable) event.preventDefault();
          }}
        >
          <div className={slot("header", "flex shrink-0 items-center gap-3 border-b border-ui-border p-4")} style={styles?.header}>
            {icon != null && <span aria-hidden="true" className={slot("icon", "flex size-10 shrink-0 items-center justify-center rounded-(--ui-radius-md) bg-ui-primary/10 text-ui-primary")} style={styles?.icon}>{icon}</span>}
            <DialogPrimitive.Title className={slot("title", "min-w-0 flex-1 text-lg font-semibold")} style={styles?.title}>
              {title ?? <span className="sr-only">Diálogo</span>}
            </DialogPrimitive.Title>
            {closable && <DialogPrimitive.Close aria-label={messages.close} className={slot("closeButton", "inline-flex size-8 shrink-0 items-center justify-center rounded-(--ui-radius-sm) hover:bg-ui-muted focus-visible:outline-2 focus-visible:outline-ui-focus")} style={styles?.closeButton}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M6 18 18 6" /></svg>
            </DialogPrimitive.Close>}
          </div>
          {description != null && <DialogPrimitive.Description className={unstyled ? undefined : "px-4 pt-3 text-sm text-ui-foreground/75"}>{description}</DialogPrimitive.Description>}
          <div ref={bodyRef} className={slot("body", "relative min-h-0 flex-1 overflow-auto")} style={{ position: "relative", ...styles?.body }}>
            {children}
            <LoadingOverlay open={loading} blocking target="container" message={loadingMessage} unstyled={unstyled} />
          </div>
          {footer != null && <div className={slot("footer", "shrink-0 border-t border-ui-border p-4")} style={styles?.footer}>{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

Dialog.displayName = "Dialog";
