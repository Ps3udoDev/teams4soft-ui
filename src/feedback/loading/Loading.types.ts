import type { ReactNode } from "react";

export interface LoadingOptions {
  message?: ReactNode;
  indicator?: ReactNode;
}

export interface LoadingStoreState extends LoadingOptions {
  count: number;
}

export interface LoadingStore {
  show(options?: LoadingOptions): void;
  hide(): void;
  getState(): LoadingStoreState;
  getServerState(): LoadingStoreState;
  subscribe(listener: () => void): () => void;
  clear(): void;
}

export interface LoadingApi {
  show(message?: ReactNode | LoadingOptions): void;
  hide(): void;
  wrap<T>(promise: Promise<T>, message?: ReactNode | LoadingOptions): Promise<T>;
}

export interface LoadingProviderProps {
  global?: boolean;
  children?: ReactNode;
}
