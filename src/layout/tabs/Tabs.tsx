import * as React from "react";
import { cn } from "../../lib";
import type { TabsProps } from "./Tabs.types";

const listBaseClassName = "flex gap-1 overflow-x-auto border-b border-ui-border data-[orientation=vertical]:flex-col data-[orientation=vertical]:overflow-x-visible data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r data-[orientation=vertical]:pr-2";
const tabBaseClassName =
  "rounded-(--radius-ui-sm) px-3 py-2 text-sm font-medium text-ui-foreground/70 outline-none transition-colors hover:text-ui-foreground focus-visible:ring-2 focus-visible:ring-ui-focus disabled:pointer-events-none disabled:opacity-50 data-[selected=true]:bg-ui-muted data-[selected=true]:text-ui-foreground";
const panelBaseClassName = "min-w-0 flex-1 pt-3 data-[orientation=vertical]:pt-0 data-[orientation=vertical]:pl-4";

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      value,
      defaultValue,
      onValueChange,
      orientation = "horizontal",
      keepMounted = true,
      className,
      classNames,
      style,
      styles,
      unstyled = false,
      ...rest
    },
    ref,
  ) => {
    const baseId = React.useId();
    const enabledItems = items.filter((i) => !i.disabled);
    const firstEnabled = enabledItems[0]?.value ?? items[0]?.value ?? "";
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? firstEnabled);
    const rawActive = isControlled ? value : internalValue;
    const activeExists = enabledItems.some((i) => i.value === rawActive);
    const activeValue = !isControlled && !activeExists ? firstEnabled : rawActive;
    const focusableFallback = activeExists ? null : firstEnabled;
    const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());

    const selectTab = (next: string, focus = false) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
      if (focus) tabRefs.current.get(next)?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentVal: string) => {
      const idx = enabledItems.findIndex((i) => i.value === currentVal);
      if (idx === -1 || enabledItems.length === 0) return;
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

      let targetIndex: number | null = null;
      if (event.key === nextKey) targetIndex = (idx + 1) % enabledItems.length;
      else if (event.key === prevKey) targetIndex = (idx - 1 + enabledItems.length) % enabledItems.length;
      else if (event.key === "Home") targetIndex = 0;
      else if (event.key === "End") targetIndex = enabledItems.length - 1;

      if (targetIndex !== null) {
        event.preventDefault();
        selectTab(enabledItems[targetIndex]!.value, true);
      }
    };

    return (
      <div
        ref={ref}
        data-slot="root"
        data-orientation={orientation}
        className={cn(
          !unstyled && (orientation === "vertical" ? "flex items-start" : "flex flex-col"),
          className,
          classNames?.root,
        )}
        style={{ ...styles?.root, ...style }}
        {...rest}
      >
        <div
          role="tablist"
          aria-orientation={orientation}
          data-slot="list"
          data-orientation={orientation}
          className={cn(!unstyled && listBaseClassName, classNames?.list)}
          style={styles?.list}
        >
          {items.map((item, idx) => {
            const selected = item.value === activeValue;
            const isTabStop = selected || item.value === focusableFallback;
            const tabId = `${baseId}-tab-${idx}`;
            const panelId = `${baseId}-panel-${idx}`;
            return (
              <button
                key={item.value}
                ref={(el) => {
                  if (el) tabRefs.current.set(item.value, el);
                  else tabRefs.current.delete(item.value);
                }}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={isTabStop ? 0 : -1}
                disabled={item.disabled}
                data-slot="tab"
                data-selected={selected || undefined}
                onClick={() => selectTab(item.value)}
                onKeyDown={(e) => onKeyDown(e, item.value)}
                className={cn(!unstyled && tabBaseClassName, classNames?.tab)}
                style={styles?.tab}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {items.map((item, idx) => {
          const selected = item.value === activeValue;
          if (!keepMounted && !selected) return null;
          const tabId = `${baseId}-tab-${idx}`;
          const panelId = `${baseId}-panel-${idx}`;
          return (
            <div
              key={item.value}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              hidden={!selected}
              data-slot="panel"
              data-orientation={orientation}
              className={cn(!unstyled && panelBaseClassName, classNames?.panel)}
              style={styles?.panel}
            >
              {item.content}
            </div>
          );
        })}
      </div>
    );
  },
);

Tabs.displayName = "Tabs";
