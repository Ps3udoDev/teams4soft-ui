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
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wasOpenRef = React.useRef(false);
  const escapeCloseRef = React.useRef(false);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const enabledIndices = React.useMemo(
    () => items.map((item, idx) => (item.disabled ? -1 : idx)).filter((idx) => idx !== -1),
    [items],
  );
  const enabledRef = React.useRef(enabledIndices);
  enabledRef.current = enabledIndices;

  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const first = enabledRef.current[0] ?? 0;
      setActiveIndex(first);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      escapeCloseRef.current = true;
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
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
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setOpen}>
      <Popover.Trigger
        asChild
        ref={triggerRef as React.Ref<HTMLButtonElement>}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onContextMenu={(event) => {
          event.preventDefault();
          if (!disabled) setOpen(true);
        }}
      >
        {trigger ?? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={triggerLabel}
            className={classNames?.trigger}
            style={styles?.trigger}
          >
            ⋮
          </Button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={menuRef}
          align={align}
          sideOffset={4}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          onOpenAutoFocus={(event) => {
            if (enabledRef.current.length === 0) return;
            event.preventDefault();
            const first = enabledRef.current[0]!;
            itemRefs.current[first]?.focus();
          }}
          onCloseAutoFocus={(event) => {
            const byEscape = escapeCloseRef.current;
            escapeCloseRef.current = false;
            const active = document.activeElement;
            const shouldRestore =
              byEscape ||
              !active ||
              active === document.body ||
              Boolean(menuRef.current?.contains(active));
            event.preventDefault();
            if (shouldRestore) {
              triggerRef.current?.focus();
            }
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
                setOpen(false);
                item.onSelect();
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
