import * as React from "react";
import { cn, useClientLayoutEffect } from "../../lib";
import type { SectionPanelProps } from "./SectionPanel.types";

const rootBaseClassName = "rounded-(--radius-ui-md) border border-ui-border bg-ui-background text-ui-foreground";
const headerBaseClassName =
  "flex flex-col gap-2 border-b border-ui-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between data-[collapsed=true]:border-b-0";
const triggerBaseClassName =
  "inline-flex items-center gap-2 text-left text-base font-semibold text-ui-foreground outline-none focus-visible:ring-2 focus-visible:ring-ui-focus rounded-(--radius-ui-sm)";
const titleBaseClassName = "text-base font-semibold text-ui-foreground";
const descriptionBaseClassName = "text-sm text-ui-foreground/60";
const actionsBaseClassName = "flex flex-wrap items-center gap-2";
const contentBaseClassName = "p-4";

export const SectionPanel = React.forwardRef<HTMLElement, SectionPanelProps>(
  (
    {
      title,
      description,
      actions,
      collapsible = false,
      collapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      headingLevel = 2,
      className,
      classNames,
      styles,
      style,
      unstyled = false,
      children,
      "aria-labelledby": ariaLabelledByProp,
      ...rest
    },
    ref,
  ) => {
    const titleId = React.useId();
    const contentId = React.useId();
    const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

    const isControlled = collapsed !== undefined;
    const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
    const isCollapsed = collapsible ? (isControlled ? collapsed : internalCollapsed) : false;

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const focusInsideRef = React.useRef(false);
    const prevCollapsedRef = React.useRef(isCollapsed);

    useClientLayoutEffect(() => {
      const wasCollapsed = prevCollapsedRef.current;
      prevCollapsedRef.current = isCollapsed;
      if (!wasCollapsed && isCollapsed) {
        const activeInside =
          focusInsideRef.current || Boolean(contentRef.current?.contains(document.activeElement));
        focusInsideRef.current = false;
        if (activeInside) {
          triggerRef.current?.focus();
        }
      }
    }, [isCollapsed]);

    const toggle = () => {
      if (!collapsible) return;
      const next = !isCollapsed;
      if (!isControlled) setInternalCollapsed(next);
      onCollapsedChange?.(next);
    };

    const labelledBy = [titleId, ariaLabelledByProp].filter(Boolean).join(" ") || undefined;

    return (
      <section
        ref={ref}
        aria-labelledby={labelledBy}
        data-slot="root"
        data-collapsed={isCollapsed || undefined}
        data-expanded={!isCollapsed || undefined}
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        {...rest}
      >
        <div
          data-slot="header"
          data-collapsed={isCollapsed || undefined}
          className={cn(!unstyled && headerBaseClassName, classNames?.header)}
          style={styles?.header}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <Heading
              id={titleId}
              data-slot="title"
              className={cn(!unstyled && !collapsible && titleBaseClassName, classNames?.title)}
              style={styles?.title}
            >
              {collapsible ? (
                <button
                  ref={triggerRef}
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={contentId}
                  data-slot="trigger"
                  onClick={toggle}
                  className={cn(!unstyled && triggerBaseClassName, classNames?.trigger)}
                  style={styles?.trigger}
                >
                  <span aria-hidden="true" className="text-xs">
                    {isCollapsed ? "▸" : "▾"}
                  </span>
                  <span>{title}</span>
                </button>
              ) : (
                title
              )}
            </Heading>
            {description ? (
              <p
                data-slot="description"
                className={cn(!unstyled && descriptionBaseClassName, classNames?.description)}
                style={styles?.description}
              >
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div
              data-slot="actions"
              className={cn(!unstyled && actionsBaseClassName, classNames?.actions)}
              style={styles?.actions}
            >
              {actions}
            </div>
          ) : null}
        </div>
        <div
          ref={contentRef}
          id={contentId}
          hidden={isCollapsed}
          data-slot="content"
          onFocusCapture={() => {
            focusInsideRef.current = true;
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              focusInsideRef.current = false;
            }
          }}
          className={cn(!unstyled && contentBaseClassName, classNames?.content)}
          style={styles?.content}
        >
          {children}
        </div>
      </section>
    );
  },
);

SectionPanel.displayName = "SectionPanel";
