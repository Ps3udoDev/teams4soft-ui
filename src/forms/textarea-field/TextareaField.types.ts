import type * as React from "react";

export interface TextareaFieldClassNames {
  root?: string;
  textarea?: string;
}

export interface TextareaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  invalid?: boolean;
  classNames?: TextareaFieldClassNames;
  styles?: Partial<Record<keyof TextareaFieldClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
