import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn, composeEventHandlers } from "../../lib";
import { buttonVariants } from "./Button.variants";
import type { ButtonProps } from "./Button.types";

export { buttonVariants } from "./Button.variants";

/** Spinner mínimo, sin dependencias de icon-set externas. Hereda `currentColor`. */
function ButtonSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

function hasAccessibleName(
  ariaLabel: unknown,
  ariaLabelledBy: unknown,
  children: React.ReactNode,
): boolean {
  if (typeof ariaLabel === "string" && ariaLabel.trim().length > 0) return true;
  if (typeof ariaLabelledBy === "string" && ariaLabelledBy.trim().length > 0)
    return true;
  return typeof children === "string" && children.trim().length > 0;
}

/**
 * Botón base de la librería. HTML nativo por defecto; `asChild` compone con
 * un único hijo interactivo (p. ej. `<a>`) vía Radix `Slot` sin anidar
 * controles. Consulta `components_docs/migration/01_button.md` para el
 * contrato completo.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingLabel = "Cargando",
      leadingIcon,
      trailingIcon,
      fullWidth = false,
      asChild = false,
      className,
      classNames,
      unstyled = false,
      styles,
      style,
      disabled,
      type,
      onClick,
      children,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...rest
    },
    ref,
  ) => {
    const isBlocked = Boolean(disabled) || loading;

    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production" &&
      size === "icon" &&
      !asChild &&
      !hasAccessibleName(ariaLabel, ariaLabelledBy, children)
    ) {
      console.warn(
        '[Button] size="icon" requiere un nombre accesible: pasa `aria-label`, `aria-labelledby` o contenido de texto.',
      );
    }

    // El guard corre siempre primero; si bloquea, `preventDefault` evita que
    // el `onClick` del consumidor llegue a ejecutarse (protección de doble
    // acción también para `asChild`, donde no existe `disabled` nativo).
    const guardClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isBlocked) {
          event.preventDefault();
        }
      },
      [isBlocked],
    );
    const handleClick = composeEventHandlers<React.MouseEvent<HTMLButtonElement>>(
      guardClick,
      (event) => onClick?.(event),
    );

    const rootClassName = unstyled
      ? cn(fullWidth && "w-full", className, classNames?.root)
      : cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className,
          classNames?.root,
        );

    const iconSlotClassName = (slot?: string) =>
      unstyled ? cn(slot) : cn("shrink-0", slot);

    const content = (
      <>
        {loading ? (
          <span
            className={iconSlotClassName(classNames?.spinner)}
            style={styles?.spinner}
            aria-hidden="true"
          >
            <ButtonSpinner />
          </span>
        ) : leadingIcon ? (
          <span
            className={iconSlotClassName(classNames?.leadingIcon)}
            style={styles?.leadingIcon}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}
        <span
          className={cn(classNames?.content)}
          style={styles?.content}
          aria-hidden={loading || undefined}
        >
          {children}
        </span>
        {!loading && trailingIcon ? (
          <span
            className={iconSlotClassName(classNames?.trailingIcon)}
            style={styles?.trailingIcon}
            aria-hidden="true"
          >
            {trailingIcon}
          </span>
        ) : null}
        {loading ? <span className="sr-only">{loadingLabel}</span> : null}
      </>
    );

    const sharedProps = {
      className: rootClassName,
      style: { ...styles?.root, ...style },
      "data-variant": variant,
      "data-size": size,
      "data-loading": loading || undefined,
      "data-disabled": isBlocked || undefined,
      "aria-busy": loading || undefined,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      onClick: handleClick,
      ...rest,
    };

    if (asChild) {
      // Slot requiere exactamente un hijo elemento: no se envuelve con la
      // estructura de iconos/spinner, se delega en el propio hijo.
      return (
        <Slot ref={ref} aria-disabled={isBlocked || undefined} {...sharedProps}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={isBlocked}
        {...sharedProps}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";
