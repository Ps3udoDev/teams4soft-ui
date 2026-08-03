import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn, devWarn } from "../../lib";
import { useToastContext } from "./Toast.context";
import { TOAST_EXIT_MS, resolveToastDuration } from "./toast-store";
import type { ToastEntry, ToastPosition, ToastTone } from "./Toast.types";

const positionClassName: Record<ToastPosition, string> = {
  "top-left": "top-0 left-0",
  "top-center": "top-0 left-1/2 -translate-x-1/2",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0 flex-col-reverse",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "bottom-right": "bottom-0 right-0 flex-col-reverse",
};

const toneAccentClassName: Record<ToastTone, string> = {
  neutral: "border-l-4 border-l-ui-border",
  info: "border-l-4 border-l-ui-primary",
  success: "border-l-4 border-l-ui-primary",
  warning: "border-l-4 border-l-ui-danger",
  error: "border-l-4 border-l-ui-danger",
};

/** Prefijo solo para lectores de pantalla: el tono no puede depender del color. */
const toneLabel: Record<ToastTone, string> = {
  neutral: "Aviso",
  info: "Información",
  success: "Éxito",
  warning: "Advertencia",
  error: "Error",
};

const viewportBaseClassName =
  "fixed z-50 m-0 flex w-[min(24rem,calc(100vw-2rem))] list-none flex-col gap-2 p-4 outline-none";

const rootBaseClassName =
  "flex items-start gap-3 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-3 text-ui-foreground shadow-lg data-[state=closed]:opacity-0 data-[swipe=end]:opacity-0 motion-safe:transition-opacity motion-reduce:transition-none";

const iconBaseClassName = "mt-0.5 flex shrink-0 items-center";
const contentBaseClassName = "flex min-w-0 flex-1 flex-col gap-0.5";
const titleBaseClassName = "text-sm font-medium";
const messageBaseClassName = "text-sm text-ui-foreground/70";
const actionBaseClassName =
  "shrink-0 rounded-(--radius-ui-sm) px-2 py-1 text-sm font-medium text-ui-primary outline-none hover:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus";
const closeButtonBaseClassName =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-ui-sm) text-ui-foreground/60 outline-none hover:bg-ui-muted hover:text-ui-foreground focus-visible:ring-2 focus-visible:ring-ui-focus";

function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function IconAlertCircle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.5v-5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function IconDot() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Icono por defecto de cada tono. El tono nunca depende solo del color (§8 del
 * spec): esto es lo que hace que un toast sea distinguible incluso con
 * `success` e `info` compartiendo acento de color hasta que existan los
 * tokens `ui-success`/`ui-warning`. `entry.icon` (por toast) y `icons` (del
 * provider) siguen ganando sobre este valor; ver el orden de resolución en
 * `ToastItem`.
 */
const defaultToneIcon: Record<ToastTone, React.ReactNode> = {
  success: <IconCheck />,
  error: <IconAlertCircle />,
  warning: <IconAlertTriangle />,
  info: <IconInfo />,
  neutral: <IconDot />,
};

function ToastItem({ entry }: { entry: ToastEntry }) {
  const { store, defaultDuration, icons, classNames, styles, unstyled } =
    useToastContext();

  // La retirada de la cola se programa por temporizador, no por el evento de
  // fin de transición: en jsdom y con reduced-motion ese evento nunca llega.
  React.useEffect(() => {
    if (entry.status !== "closing") return;
    const timer = setTimeout(() => store.remove(entry.id), TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [entry.status, entry.id, store]);

  const duration = resolveToastDuration(entry.duration, defaultDuration);

  const icon = entry.icon ?? icons?.[entry.tone] ?? defaultToneIcon[entry.tone];

  const handleAction = () => {
    if (!entry.action) return;
    try {
      entry.action.onClick();
    } catch (error) {
      // Un fallo del consumidor no debe bloquear la cola.
      devWarn(`La acción del toast "${entry.id}" lanzó una excepción: ${String(error)}`);
    }
    store.dismiss(entry.id);
  };

  return (
    <ToastPrimitive.Root
      open={entry.status === "open"}
      duration={duration}
      type={entry.tone === "error" ? "foreground" : "background"}
      onOpenChange={(open) => {
        if (!open) store.dismiss(entry.id);
      }}
      data-tone={entry.tone}
      className={cn(
        !unstyled && rootBaseClassName,
        !unstyled && toneAccentClassName[entry.tone],
        classNames?.root,
      )}
      style={styles?.root}
    >
      {icon ? (
        <span
          className={cn(!unstyled && iconBaseClassName, classNames?.icon)}
          style={styles?.icon}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div
        className={cn(!unstyled && contentBaseClassName, classNames?.content)}
        style={styles?.content}
      >
        <ToastPrimitive.Title
          className={cn(!unstyled && titleBaseClassName, classNames?.title)}
          style={styles?.title}
        >
          <span className="sr-only">{toneLabel[entry.tone]}: </span>
          {entry.title}
        </ToastPrimitive.Title>
        {entry.message !== undefined && entry.message !== null ? (
          <ToastPrimitive.Description
            className={cn(
              !unstyled && messageBaseClassName,
              classNames?.message,
            )}
            style={styles?.message}
          >
            {entry.message}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      {entry.action ? (
        <ToastPrimitive.Action
          altText={entry.action.altText ?? entry.action.label}
          onClick={handleAction}
          className={cn(!unstyled && actionBaseClassName, classNames?.action)}
          style={styles?.action}
        >
          {entry.action.label}
        </ToastPrimitive.Action>
      ) : null}
      {entry.dismissible ? (
        <ToastPrimitive.Close
          aria-label="Cerrar"
          className={cn(
            !unstyled && closeButtonBaseClassName,
            classNames?.closeButton,
          )}
          style={styles?.closeButton}
        >
          <IconX />
        </ToastPrimitive.Close>
      ) : null}
    </ToastPrimitive.Root>
  );
}

/**
 * Superficie donde se apilan los toasts. `ToastProvider` la monta por sí mismo;
 * exportarla permite colocarla a mano con `renderViewport={false}`.
 */
export function ToastViewport(): React.ReactElement {
  const {
    store,
    position,
    maxVisible,
    className,
    style,
    classNames,
    styles,
    unstyled,
  } = useToastContext();

  const state = React.useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getServerState,
  );

  // FIFO: los más antiguos ocupan los huecos visibles; el resto espera turno.
  const visible = state.toasts.slice(0, maxVisible);

  return (
    <>
      {visible.map((entry) => (
        <ToastItem key={`${entry.id}:${entry.restartedAt}`} entry={entry} />
      ))}
      <ToastPrimitive.Viewport
        data-position={position}
        className={cn(
          !unstyled && viewportBaseClassName,
          !unstyled && positionClassName[position],
          className,
          classNames?.viewport,
        )}
        style={{ ...styles?.viewport, ...style }}
      />
    </>
  );
}

ToastViewport.displayName = "ToastViewport";
