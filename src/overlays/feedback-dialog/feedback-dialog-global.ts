import type { ReactNode } from "react";
import { devWarn } from "../../lib";
import { createFeedbackDialogStore } from "./feedback-dialog-store";
import type { ConfirmOptions, FeedbackDialogStore, NotifyOptions } from "./feedback-dialog-store";

const GLOBAL_FEEDBACK_DIALOG_KEY = Symbol.for("@teams4soft/teams4soft-ui.feedback-dialog");
interface GlobalFeedbackDialogSlot { store: FeedbackDialogStore; claimed: boolean }
type GlobalWithFeedbackDialog = typeof globalThis & {
  [GLOBAL_FEEDBACK_DIALOG_KEY]?: GlobalFeedbackDialogSlot;
};

// Every entry point (and ESM/CJS copy) must observe the same queue and owner.
const target = globalThis as GlobalWithFeedbackDialog;
const slot = target[GLOBAL_FEEDBACK_DIALOG_KEY] ??= {
  store: createFeedbackDialogStore(),
  claimed: false,
};

export const defaultFeedbackDialogStore = slot.store;

export function claimGlobalFeedbackDialogStore(): boolean {
  if (slot.claimed) {
    devWarn("Hay más de un <FeedbackDialogProvider global />. Solo el primero montado atiende confirm()/notify().");
    return false;
  }
  slot.claimed = true;
  return true;
}

export function releaseGlobalFeedbackDialogStore(): void {
  slot.claimed = false;
  slot.store.clear();
}

function requireProvider(): void {
  if (!slot.claimed) {
    throw new Error("[teams4soft-ui] confirm()/notify() requieren <FeedbackDialogProvider global /> montado en la raíz de la app.");
  }
}

/** Client-side imperative confirmation. Requires a mounted global provider. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  requireProvider();
  return slot.store.enqueue(options);
}

type NotifyShortcutOptions = Omit<NotifyOptions, "message" | "severity">;
export interface NotifyApi {
  (options: NotifyOptions): Promise<void>;
  error(message: ReactNode, options?: NotifyShortcutOptions): Promise<void>;
  success(message: ReactNode, options?: NotifyShortcutOptions): Promise<void>;
  warn(message: ReactNode, options?: NotifyShortcutOptions): Promise<void>;
  info(message: ReactNode, options?: NotifyShortcutOptions): Promise<void>;
}

function showNotice(options: NotifyOptions): Promise<void> {
  requireProvider();
  return slot.store.enqueue({ ...options, variant: "notice", showReject: false }).then(() => {});
}

export const notify: NotifyApi = Object.assign(showNotice, {
  error: (message: ReactNode, options?: NotifyShortcutOptions) => showNotice({ ...options, message, severity: "danger" }),
  success: (message: ReactNode, options?: NotifyShortcutOptions) => showNotice({ ...options, message, severity: "success" }),
  warn: (message: ReactNode, options?: NotifyShortcutOptions) => showNotice({ ...options, message, severity: "warn" }),
  info: (message: ReactNode, options?: NotifyShortcutOptions) => showNotice({ ...options, message, severity: "info" }),
});
