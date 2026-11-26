import type * as React from "react";

export type FileRejectReason = "type" | "size";

export interface FilePickerFieldClassNames {
  root?: string;
  control?: string;
  trigger?: string;
  fileName?: string;
  clearButton?: string;
}

export interface FilePickerFieldProps {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  value?: File | null;
  defaultValue?: File | null;
  onValueChange?: (file: File | null) => void;
  onReject?: (reason: FileRejectReason, file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  selectLabel?: string;
  clearLabel?: string;
  className?: string;
  classNames?: FilePickerFieldClassNames;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof FilePickerFieldClassNames, React.CSSProperties>>;
  unstyled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}
