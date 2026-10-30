import type { FeedbackDialogProps } from "./FeedbackDialog.types";

export type ConfirmOptions = Omit<FeedbackDialogProps, "open" | "onOpenChange">;
export type NotifyOptions = Omit<ConfirmOptions, "variant"> & { variant?: "notice" };
export type FeedbackDialogRequest = Readonly<ConfirmOptions>;

export interface FeedbackDialogStoreState {
  current: FeedbackDialogRequest | null;
  /** Number of requests waiting behind the visible dialog. */
  pending: number;
}

export interface FeedbackDialogStore {
  enqueue(request: ConfirmOptions): Promise<boolean>;
  resolveCurrent(accepted: boolean, expectedRequest?: FeedbackDialogRequest): void;
  getState(): FeedbackDialogStoreState;
  getServerState(): FeedbackDialogStoreState;
  subscribe(listener: () => void): () => void;
  /** Settles all outstanding promises as rejected when their provider leaves. */
  clear(): void;
}

const EMPTY_STATE: FeedbackDialogStoreState = { current: null, pending: 0 };

/** FIFO independent of React; snapshots retain their identity between changes. */
export function createFeedbackDialogStore(): FeedbackDialogStore {
  let state = EMPTY_STATE;
  const listeners = new Set<() => void>();
  const queue: Array<{
    request: FeedbackDialogRequest;
    resolve: (accepted: boolean) => void;
  }> = [];

  const publish = () => {
    state = { current: queue[0]?.request ?? null, pending: Math.max(0, queue.length - 1) };
    for (const listener of listeners) listener();
  };

  return {
    enqueue(options) {
      return new Promise<boolean>((resolve) => {
        // Own the options object: reusing one object still creates distinct requests.
        queue.push({ request: { ...options }, resolve });
        publish();
      });
    },
    resolveCurrent(accepted, expectedRequest) {
      const current = queue[0];
      if (!current || (expectedRequest && current.request !== expectedRequest)) return;
      queue.shift();
      publish();
      current.resolve(accepted);
    },
    getState: () => state,
    getServerState: () => EMPTY_STATE,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    clear() {
      if (!queue.length) return;
      const abandoned = queue.splice(0);
      publish();
      for (const entry of abandoned) entry.resolve(false);
    },
  };
}
