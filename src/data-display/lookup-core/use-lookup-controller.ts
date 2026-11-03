import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import type { LookupQuery, LookupSearchContext, LookupSearchResponse } from "./lookup-core.types";
import { isEmptyQuery, normalizeResponse } from "./lookup-utils";

export type LookupStatus = "idle" | "searching" | "choosing";

export type LookupState<T, TQuery extends LookupQuery = LookupQuery> = {
  status: LookupStatus;
  rows: T[];
  /** `null` when the rows are paginated on the client. */
  total: number | null;
  /** 1-based. */
  page: number;
  query: TQuery | null;
  criterion?: string;
};

export type LookupOutcome<T, TQuery extends LookupQuery = LookupQuery> =
  | { type: "selected"; item: T }
  | { type: "choose" }
  | { type: "notFound"; query: TQuery; emptyMessage?: ReactNode }
  | { type: "queryRequired" }
  | { type: "aborted" }
  | { type: "error"; error: unknown };

export type UseLookupControllerOptions<T, TQuery extends LookupQuery> = {
  search?: (query: TQuery, ctx: LookupSearchContext) => Promise<LookupSearchResponse<T>>;
  items?: T[];
  localMatch?: (query: TQuery) => T[];
  pageSize: number;
  autoSelectSingle: boolean;
  onSearchError?: (error: unknown) => void;
};

export type RunSearchOptions = { page?: number; criterion?: string; intent: "commit" | "browse" };

type Action<T, TQuery extends LookupQuery> =
  | { type: "start" }
  | { type: "restore"; status: LookupStatus }
  | { type: "loaded"; state: LookupState<T, TQuery> }
  | { type: "page"; page: number }
  | { type: "reset" };

function initialState<T, TQuery extends LookupQuery>(): LookupState<T, TQuery> {
  return { status: "idle", rows: [], total: null, page: 1, query: null };
}

function reducer<T, TQuery extends LookupQuery>(state: LookupState<T, TQuery>, action: Action<T, TQuery>): LookupState<T, TQuery> {
  switch (action.type) {
    case "start":
      return state.status === "searching" ? state : { ...state, status: "searching" };
    case "restore":
      return { ...state, status: action.status };
    case "loaded":
      return action.state;
    case "page":
      return { ...state, page: action.page };
    case "reset":
      return initialState();
  }
}

export function useLookupController<T, TQuery extends LookupQuery = LookupQuery>(opts: UseLookupControllerOptions<T, TQuery>) {
  const [state, dispatch] = useReducer(
    reducer as (s: LookupState<T, TQuery>, a: Action<T, TQuery>) => LookupState<T, TQuery>,
    undefined,
    initialState<T, TQuery>,
  );

  // The consumer usually passes inline functions; reading them from a ref keeps the returned callbacks stable.
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const stateRef = useRef(state);
  stateRef.current = state;

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const previousStatusRef = useRef<LookupStatus>("idle");
  const pageSizeRef = useRef(opts.pageSize);
  const lastRef = useRef<{ query: TQuery; criterion?: string; total: number | null } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const begin = useCallback(() => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    return requestIdRef.current;
  }, []);

  const execute = useCallback(
    async (
      query: TQuery,
      page: number,
      pageSize: number,
      criterion: string | undefined,
      intent: RunSearchOptions["intent"] | "page",
    ): Promise<LookupOutcome<T, TQuery>> => {
      const { search, items, localMatch, autoSelectSingle, onSearchError } = optsRef.current;
      const id = begin();
      pageSizeRef.current = pageSize;

      if (!search) {
        const all = items ?? [];
        const rows = intent === "browse" && isEmptyQuery(query) ? all : localMatch ? localMatch(query) : all;
        lastRef.current = { query, criterion, total: null };
        dispatch({ type: "loaded", state: { status: "choosing", rows, total: null, page, query, criterion } });
        return { type: "choose" };
      }

      if (stateRef.current.status !== "searching") previousStatusRef.current = stateRef.current.status;
      const previousStatus = previousStatusRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      dispatch({ type: "start" });

      const isStale = () => id !== requestIdRef.current;
      let response: LookupSearchResponse<T>;
      try {
        response = await search(query, { page, pageSize, criterion, signal: controller.signal });
      } catch (error) {
        if (isStale()) return { type: "aborted" };
        dispatch({ type: "restore", status: previousStatus });
        onSearchError?.(error);
        return { type: "error", error };
      }
      if (isStale()) return { type: "aborted" };

      const normalized = normalizeResponse(response);
      if (normalized.kind === "abort") {
        dispatch({ type: "restore", status: previousStatus });
        return { type: "aborted" };
      }
      const rows = normalized.items;
      const total = normalized.kind === "server" ? normalized.total : null;

      if (intent === "page") {
        lastRef.current = { query, criterion, total };
        dispatch({ type: "loaded", state: { status: "choosing", rows, total, page, query, criterion } });
        return { type: "choose" };
      }

      if (rows.length === 0) {
        dispatch({ type: "restore", status: previousStatus });
        if (intent === "browse" && isEmptyQuery(query)) return { type: "queryRequired" };
        return { type: "notFound", query, emptyMessage: normalized.kind === "server" ? normalized.emptyMessage : undefined };
      }

      const only = rows[0];
      if (rows.length === 1 && intent === "commit" && autoSelectSingle && only !== undefined) {
        dispatch({ type: "reset" });
        return { type: "selected", item: only };
      }

      lastRef.current = { query, criterion, total };
      dispatch({ type: "loaded", state: { status: "choosing", rows, total, page, query, criterion } });
      return { type: "choose" };
    },
    [begin],
  );

  const runSearch = useCallback(
    (query: TQuery, runOpts: RunSearchOptions) =>
      execute(query, runOpts.page ?? 1, optsRef.current.pageSize, runOpts.criterion, runOpts.intent),
    [execute],
  );

  const goToPage = useCallback(
    async (page: number, pageSize?: number): Promise<LookupOutcome<T, TQuery>> => {
      const last = lastRef.current;
      if (!last) return { type: "aborted" };
      const size = pageSize ?? pageSizeRef.current;
      if (last.total === null) {
        pageSizeRef.current = size;
        dispatch({ type: "page", page });
        return { type: "choose" };
      }
      return execute(last.query, page, size, last.criterion, "page");
    },
    [execute],
  );

  const close = useCallback(() => {
    begin();
    lastRef.current = null;
    dispatch({ type: "reset" });
  }, [begin]);

  return { state, runSearch, goToPage, close };
}
