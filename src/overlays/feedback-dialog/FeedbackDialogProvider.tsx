import * as React from "react";
import { FeedbackDialog } from "./FeedbackDialog";
import { createFeedbackDialogStore } from "./feedback-dialog-store";
import {
  claimGlobalFeedbackDialogStore,
  defaultFeedbackDialogStore,
  releaseGlobalFeedbackDialogStore,
} from "./feedback-dialog-global";

export interface FeedbackDialogProviderProps {
  global?: boolean;
  children?: React.ReactNode;
}

/** Renders one FIFO request at a time; only the first global provider owns it. */
export function FeedbackDialogProvider({ global: isGlobal = false, children }: FeedbackDialogProviderProps): React.ReactElement {
  const [privateStore] = React.useState(createFeedbackDialogStore);
  const store = isGlobal ? defaultFeedbackDialogStore : privateStore;
  const [globalReady, setGlobalReady] = React.useState(false);

  // Claim before descendant passive effects can call confirm()/notify().
  const useClientLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
  useClientLayoutEffect(() => {
    if (!isGlobal) return () => privateStore.clear();
    const claimed = claimGlobalFeedbackDialogStore();
    setGlobalReady(claimed);
    if (!claimed) return;
    return () => {
      setGlobalReady(false);
      releaseGlobalFeedbackDialogStore();
    };
  }, [isGlobal, privateStore]);

  const { current } = React.useSyncExternalStore(store.subscribe, store.getState, store.getServerState);
  const visible = (!isGlobal || globalReady) && current;
  const session = React.useRef({ request: current, id: 0 });
  if (session.current.request !== current) {
    session.current = { request: current, id: session.current.id + 1 };
  }

  return <>
    {children}
    {visible ? <FeedbackDialog
      {...current}
      key={session.current.id}
      open
      onAccept={async () => {
        await current.onAccept?.();
        store.resolveCurrent(true, current);
      }}
      onReject={() => {
        try { current.onReject?.(); }
        finally { store.resolveCurrent(false, current); }
      }}
      onOpenChange={(open) => {
        if (!open) store.resolveCurrent(false, current);
      }}
    /> : null}
  </>;
}

FeedbackDialogProvider.displayName = "FeedbackDialogProvider";
