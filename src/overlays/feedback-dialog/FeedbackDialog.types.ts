import type * as React from "react";

export type FeedbackSeverity = "info" | "warn" | "danger" | "error" | "success";
export type FeedbackVariant = "confirm" | "notice";

export interface FeedbackDialogClassNames {
  root: string;
  icon: string;
  message: string;
  footer: string;
  acceptButton: string;
  rejectButton: string;
}

export interface FeedbackDialogProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  open: boolean;
  onOpenChange?(open: boolean): void;
  variant?: FeedbackVariant;
  severity?: FeedbackSeverity;
  title?: React.ReactNode;
  message: React.ReactNode;
  acceptLabel?: string;
  rejectLabel?: string;
  showReject?: boolean;
  onAccept?(): void | Promise<void>;
  onReject?(): void;
  icon?: React.ReactNode;
  messages?: Partial<{ title: string; accept: string; reject: string }>;
  classNames?: Partial<FeedbackDialogClassNames>;
  styles?: Partial<Record<keyof FeedbackDialogClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
