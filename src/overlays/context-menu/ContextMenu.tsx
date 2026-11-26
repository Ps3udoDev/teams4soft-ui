import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "../../lib";
import { Button } from "../../primitives";
import type { ContextMenuProps } from "./ContextMenu.types";

const contentBaseClassName =
  "z-50 min-w-44 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-1 text-sm text-ui-foreground shadow-(--ui-shadow-lg) outline-none";
const itemBaseClassName =
  "flex w-full cursor-pointer items-center rounded-(--radius-ui-sm) px-2.5 py-1.5 text-left outline-none transition-colors hover:bg-ui-muted focus-visible:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus disabled:pointer-events-none disabled:opacity-50 data-[tone=danger]:text-ui-danger";

export function ContextMenu({
  items,
  triggerLabel = "Acciones",
  trigger,
  open,
  onOpenChange,
  align = "end",
  disabled = false,
  classNames,
  styles,
  unstyled = false,
}: ContextMenuProps) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = isControlled ? open : internalOpen;
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const enabledIndices = React.useMemo(
    () => items.map((item, idx) => (item.disabled ? -1 : idx)).filter((idx) => idx !== -1),
    [items],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const first = enabledIndices[0] ?? 0;
    setActiveIndex(first);
    itemRefs.current[first]?.focus();
  }, [isOpen, enabledIndices]);

  const closeAndFocusTrigger = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (enabledIndices.length === 0) return;
    const pos = enabledIndices.indexOf(activeIndex);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = enabledIndices[(pos + 1) % enabledIndices.length]!;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = enabledIndices[(pos - 1 + enabledIndices.length) % enabledIndices.length]!;
      setActiveIndex(prev);
      itemRefs.current[prev]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      const first = enabledIndices[0]!;
      setActiveIndex(first);
      itemRefs.current[first]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const last = enabledIndices[enabledIndices.length - 1]!;
      setActiveIndex(last);
      itemRefs.current[last]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocusTrigger();
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {trigger ?? (
          <Button
            ref={triggerRef}
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={triggerLabel}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!disabled) setOpen(true);
            }}
            className={classNames?.trigger}
            style={styles?.trigger}
          >
            ⋮
          </Button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={4}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const first = enabledIndices[0] ?? 0;
            itemRefs.current[first]?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          data-slot="content"
          className={cn(!unstyled && contentBaseClassName, classNames?.content)}
          style={styles?.content}
        >
          {items.map((item, idx) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              tabIndex={idx === activeIndex ? 0 : -1}
              data-slot="item"
              data-tone={item.tone ?? "default"}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect();
                closeAndFocusTrigger();
              }}
              className={cn(!unstyled && itemBaseClassName, classNames?.item)}
              style={styles?.item}
            >
              {item.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

ContextMenu.displayName = "ContextMenu";
