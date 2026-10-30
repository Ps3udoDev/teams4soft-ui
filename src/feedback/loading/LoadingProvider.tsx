import * as React from "react";
import { LoadingOverlay } from "../loading-overlay/LoadingOverlay";
import { createLoadingStore } from "./loading-store";
import { claimGlobalLoadingStore, defaultLoadingStore, releaseGlobalLoadingStore } from "./loading-global";
import type { LoadingProviderProps } from "./Loading.types";

const useClientLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/** Hosts the global viewport indicator. Additional instances keep private stores. */
export function LoadingProvider({
  global: isGlobal = false,
  children,
}: LoadingProviderProps): React.ReactElement {
  const [privateStore] = React.useState(createLoadingStore);
  const store = isGlobal ? defaultLoadingStore : privateStore;
  const [globalReady, setGlobalReady] = React.useState(false);
  useClientLayoutEffect(() => {
    if (!isGlobal) return () => privateStore.clear();
    const claimed = claimGlobalLoadingStore();
    setGlobalReady(claimed);
    if (!claimed) return;
    return () => {
      setGlobalReady(false);
      releaseGlobalLoadingStore(true);
    };
  }, [isGlobal, privateStore]);
  const state = React.useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getServerState,
  );
  return (
    <>
      {children}
      {(!isGlobal || globalReady) ? (
        <LoadingOverlay
          open={state.count > 0}
          target="viewport"
          blocking
          message={state.message}
          indicator={state.indicator}
        />
      ) : null}
    </>
  );
}

LoadingProvider.displayName = "LoadingProvider";
