import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "../../lib";
import { TextField } from "../../forms/text-field/TextField";
import { Button } from "../../primitives";
import type { EntityLookupCriterion } from "./EntityLookupField.types";

export interface LookupInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  /** `withinControl`: focus moved to another element of this same control (the buttons). */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>, withinControl: boolean) => void;
  /** Disabled or read-only: the trigger stays inert. */
  inert: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  busy: boolean;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  onTrigger: () => void;
  /** Turns the trigger into a menu button. */
  criteria?: EntityLookupCriterion[];
  activeCriterion?: string;
  criteriaLabel?: string;
  onCriterionSelect?: (value: string) => void;
  onCriteriaOpenChange?: (open: boolean) => void;
  trailingActions?: React.ReactNode;
  unstyled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  classNames?: { input?: string; clearButton?: string; trigger?: string; criteriaMenu?: string };
  styles?: { input?: React.CSSProperties; clearButton?: React.CSSProperties; trigger?: React.CSSProperties; criteriaMenu?: React.CSSProperties };
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-required"?: React.AriaAttributes["aria-required"];
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

export const LookupInput = React.forwardRef<HTMLInputElement, LookupInputProps>(function LookupInput(
  {
    id, name, placeholder, value, onValueChange, onKeyDown, onBlur, inert, disabled, readOnly, invalid, clearable, clearLabel, busy, triggerLabel,
    triggerIcon, onTrigger, criteria, activeCriterion, criteriaLabel, onCriterionSelect, onCriteriaOpenChange, trailingActions, unstyled, className, style, classNames, styles, ...aria
  },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const hasMenu = Boolean(criteria && criteria.length > 0);

  const changeMenuOpen = (next: boolean) => {
    setMenuOpen(next);
    onCriteriaOpenChange?.(next);
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    let target: number;
    if (event.key === "ArrowDown") target = (index + 1) % items.length;
    else if (event.key === "ArrowUp") target = (index <= 0 ? items.length : index) - 1;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = items.length - 1;
    else return;
    event.preventDefault();
    items[target]?.focus();
  };

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={triggerLabel}
      aria-busy={busy || undefined}
      aria-haspopup={hasMenu ? "menu" : undefined}
      aria-expanded={hasMenu ? menuOpen : undefined}
      disabled={inert}
      unstyled={unstyled}
      className={classNames?.trigger}
      style={styles?.trigger}
      onClick={hasMenu ? undefined : onTrigger}
    >
      {busy ? <Spinner /> : (triggerIcon ?? <span aria-hidden="true">…</span>)}
    </Button>
  );

  return (
    <div ref={rootRef} className={cn(!unstyled && "flex w-full items-center gap-1", className)} style={style}>
      <TextField
        ref={ref}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onValueChange={onValueChange}
        onKeyDown={onKeyDown}
        onBlur={(event) => onBlur?.(event, rootRef.current?.contains(event.relatedTarget as Node | null) ?? false)}
        disabled={disabled}
        readOnly={readOnly}
        invalid={invalid}
        clearable={clearable}
        clearLabel={clearLabel}
        unstyled={unstyled}
        classNames={{ input: classNames?.input, clearButton: classNames?.clearButton }}
        styles={{ input: styles?.input, clearButton: styles?.clearButton }}
        autoComplete="off"
        {...aria}
      />
      {hasMenu ? (
        <Popover.Root open={menuOpen && !inert} onOpenChange={changeMenuOpen}>
          <Popover.Trigger asChild>{triggerButton}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              ref={menuRef}
              role="menu"
              aria-label={criteriaLabel}
              align="end"
              sideOffset={4}
              data-slot="criteriaMenu"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
              }}
              onKeyDown={onMenuKeyDown}
              className={cn(!unstyled && "z-50 min-w-40 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-1 text-sm text-ui-foreground shadow-md", classNames?.criteriaMenu)}
              style={styles?.criteriaMenu}
            >
              {criteria?.map((criterion) => {
                const checked = criterion.value === activeCriterion;
                return (
                  <button
                    key={criterion.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={checked}
                    tabIndex={checked ? 0 : -1}
                    className={cn(!unstyled && "flex w-full items-center gap-2 rounded-(--radius-ui-md) px-2 py-1.5 text-left outline-none hover:bg-ui-border/40 focus-visible:bg-ui-border/40 aria-checked:font-medium")}
                    onClick={() => {
                      changeMenuOpen(false);
                      onCriterionSelect?.(criterion.value);
                    }}
                  >
                    <span aria-hidden="true" className="w-4">{checked ? "✓" : ""}</span>
                    {criterion.label}
                  </button>
                );
              })}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : triggerButton}
      {trailingActions}
    </div>
  );
});
