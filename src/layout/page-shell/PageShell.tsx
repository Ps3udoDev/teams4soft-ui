import * as React from "react";
import { cn } from "../../lib";
import type { PageShellProps } from "./PageShell.types";

const rootBaseClassName = "flex w-full flex-col gap-4 text-ui-foreground";
const headerBaseClassName =
  "flex flex-col gap-3 border-b border-ui-border pb-4 sm:flex-row sm:items-center sm:justify-between";
const titleBaseClassName = "text-xl font-semibold tracking-tight text-ui-foreground";
const subtitleBaseClassName = "text-sm text-ui-foreground/60";
const actionsBaseClassName = "flex flex-wrap items-center gap-2";
const contentBaseClassName = "flex min-w-0 flex-col gap-4";

export const PageShell = React.forwardRef<HTMLElement, PageShellProps>(
  (
    {
      title,
      subtitle,
      actions,
      headingLevel = 1,
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
    const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
    const labelledBy = [titleId, ariaLabelledByProp].filter(Boolean).join(" ") || undefined;

    return (
      <section
        ref={ref}
        aria-labelledby={labelledBy}
        data-slot="root"
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
        {...rest}
      >
        <header
          data-slot="header"
          className={cn(!unstyled && headerBaseClassName, classNames?.header)}
          style={styles?.header}
        >
          <div
            data-slot="heading-group"
            className={cn(!unstyled && "min-w-0 flex-1 space-y-1", classNames?.headingGroup)}
            style={styles?.headingGroup}
          >
            <Heading
              id={titleId}
              data-slot="title"
              className={cn(!unstyled && titleBaseClassName, classNames?.title)}
              style={styles?.title}
            >
              {title}
            </Heading>
            {subtitle ? (
              <p
                data-slot="subtitle"
                className={cn(!unstyled && subtitleBaseClassName, classNames?.subtitle)}
                style={styles?.subtitle}
              >
                {subtitle}
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
        </header>
        <div
          data-slot="content"
          className={cn(!unstyled && contentBaseClassName, classNames?.content)}
          style={styles?.content}
        >
          {children}
        </div>
      </section>
    );
  },
);

PageShell.displayName = "PageShell";
