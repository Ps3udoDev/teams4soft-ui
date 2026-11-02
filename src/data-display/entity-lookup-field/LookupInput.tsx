import * as React from "react";
import { cn } from "../../lib";
import { TextField } from "../../forms/text-field/TextField";
import { Button } from "../../primitives";

export interface LookupInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  /** Disabled or read-only: the trigger stays inert. */
  inert: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  busy: boolean;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  onTrigger: () => void;
  trailingActions?: React.ReactNode;
  unstyled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  classNames?: { input?: string; clearButton?: string; trigger?: string };
  styles?: { input?: React.CSSProperties; clearButton?: React.CSSProperties; trigger?: React.CSSProperties };
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
    id, name, placeholder, value, onValueChange, onKeyDown, inert, disabled, readOnly, invalid, clearable, busy, triggerLabel,
    triggerIcon, onTrigger, trailingActions, unstyled, className, style, classNames, styles, ...aria
  },
  ref,
) {
  return (
    <div className={cn(!unstyled && "flex w-full items-center gap-1", className)} style={style}>
      <TextField
        ref={ref}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onValueChange={onValueChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        readOnly={readOnly}
        invalid={invalid}
        clearable={clearable}
        unstyled={unstyled}
        classNames={{ input: classNames?.input, clearButton: classNames?.clearButton }}
        styles={{ input: styles?.input, clearButton: styles?.clearButton }}
        autoComplete="off"
        {...aria}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={triggerLabel}
        aria-busy={busy || undefined}
        disabled={inert}
        unstyled={unstyled}
        className={classNames?.trigger}
        style={styles?.trigger}
        onClick={onTrigger}
      >
        {busy ? <Spinner /> : (triggerIcon ?? <span aria-hidden="true">…</span>)}
      </Button>
      {trailingActions}
    </div>
  );
});
