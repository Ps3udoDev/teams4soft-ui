import type { LoadingStore, LoadingStoreState } from "./Loading.types";

const EMPTY_STATE: LoadingStoreState = { count: 0 };

/** A stable snapshot and a reference count shared by independent operations. */
export function createLoadingStore(): LoadingStore {
  let state = EMPTY_STATE;
  const listeners = new Set<() => void>();
  const publish = (next: LoadingStoreState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  return {
    show: (options = {}) => publish({ ...options, count: state.count + 1 }),
    hide() {
      if (!state.count) return;
      publish(state.count === 1 ? EMPTY_STATE : { ...state, count: state.count - 1 });
    },
    getState: () => state,
    getServerState: () => EMPTY_STATE,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    clear() { if (state.count) publish(EMPTY_STATE); },
  };
}
