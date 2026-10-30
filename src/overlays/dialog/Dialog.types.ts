import type * as React from "react";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";

export interface DialogClassNames {
  overlay: string;
  content: string;
  header: string;
  icon: string;
  title: string;
  closeButton: string;
  body: string;
  footer: string;
}

export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onHide?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  size?: DialogSize;
  width?: string;
  modal?: boolean;
  closable?: boolean;
  closeOnOverlayClick?: boolean;
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  mobileVariant?: "fullscreen" | "sheet";
  hideMode?: "immediate" | "after-animation";
  messages?: { close: string };
  classNames?: Partial<DialogClassNames>;
  styles?: Partial<Record<keyof DialogClassNames, React.CSSProperties>>;
  unstyled?: boolean;
}
