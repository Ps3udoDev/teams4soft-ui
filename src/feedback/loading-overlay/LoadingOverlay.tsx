import * as React from "react";
import { cn, devWarn } from "../../lib";
import { Spinner } from "../spinner/Spinner";
import type { LoadingOverlayProps } from "./LoadingOverlay.types";

const rootBaseClassName = "flex items-center justify-center";
const containerRootClassName = "absolute inset-0 z-40";
const viewportRootClassName = "fixed inset-0 z-50";
const backdropBaseClassName = "absolute inset-0 bg-ui-background/70";
const panelBaseClassName =
  "relative flex flex-col items-center gap-2 rounded-(--radius-ui-md) px-4 py-3 text-ui-foreground";
const messageBaseClassName = "text-sm text-ui-foreground/80";

/**
 * Capa de carga sobre una región o sobre el viewport.
 *
 * `blocking` captura el puntero pero NO inertiza el fondo (ver el JSDoc de la
 * prop): para bloqueo real de la interacción, usa un diálogo modal.
 */
export const LoadingOverlay = React.forwardRef<
  HTMLDivElement,
  LoadingOverlayProps
>(function LoadingOverlay(
  {
    open,
    message,
    blocking = false,
    target = "container",
    className,
    classNames,
    unstyled = false,
    style,
    styles,
  },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open || target !== "container") return;
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const position = getComputedStyle(parent).position;
    if (position === "static") {
      devWarn(
        '<LoadingOverlay target="container"> requiere que su elemento padre esté posicionado. Añade `relative` al contenedor.',
      );
    }
  }, [open, target]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  if (!open) return null;

  const hasMessage = message !== undefined && message !== null && message !== "";

  return (
    <div
      ref={setRefs}
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-target={target}
      data-blocking={blocking || undefined}
      className={cn(
        !unstyled && rootBaseClassName,
        !unstyled &&
          (target === "viewport"
            ? viewportRootClassName
            : containerRootClassName),
        !unstyled && !blocking && "pointer-events-none",
        className,
        classNames?.root,
      )}
      style={{ ...styles?.root, ...style }}
    >
      <div
        className={cn(!unstyled && backdropBaseClassName, classNames?.backdrop)}
        style={styles?.backdrop}
        aria-hidden="true"
      />
      <div
        className={cn(!unstyled && panelBaseClassName, classNames?.panel)}
        style={styles?.panel}
      >
        <Spinner
          decorative
          size="lg"
          unstyled={unstyled}
          className={classNames?.spinner}
          style={styles?.spinner}
        />
        {hasMessage ? (
          <span
            className={cn(!unstyled && messageBaseClassName, classNames?.message)}
            style={styles?.message}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
});

LoadingOverlay.displayName = "LoadingOverlay";
