import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LookupQuery, LookupSearchContext, LookupSearchResponse } from "./lookup-core.types";
import { useLookupController } from "./use-lookup-controller";

type Row = { id: number; name: string };
const row = (id: number): Row => ({ id, name: `r${id}` });

function deferred<V>() {
  let resolve!: (v: V) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<V>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Search<Q extends LookupQuery = string> = (q: Q, ctx: LookupSearchContext) => Promise<LookupSearchResponse<Row>>;

function setup<Q extends LookupQuery = string>(
  search: Search<Q>,
  extra: { autoSelectSingle?: boolean; onSearchError?: (e: unknown) => void } = {},
) {
  return renderHook(() =>
    useLookupController<Row, Q>({ search, pageSize: 50, autoSelectSingle: extra.autoSelectSingle ?? true, onSearchError: extra.onSearchError }),
  );
}

describe("useLookupController remote", () => {
  it("selects the single result on commit", async () => {
    const { result } = setup(async () => [row(1)]);
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("a", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "selected", item: row(1) });
    expect(result.current.state.status).toBe("idle");
  });

  it("opens the chooser for a single result when autoSelectSingle is off or intent is browse", async () => {
    const off = setup(async () => [row(1)], { autoSelectSingle: false });
    await act(async () => {
      expect(await off.result.current.runSearch("a", { intent: "commit" })).toEqual({ type: "choose" });
    });
    const browse = setup(async () => [row(1)]);
    await act(async () => {
      expect(await browse.result.current.runSearch("a", { intent: "browse" })).toEqual({ type: "choose" });
    });
    expect(browse.result.current.state.status).toBe("choosing");
  });

  it("chooses with rows for several results", async () => {
    const { result } = setup(async () => [row(1), row(2), row(3)]);
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("a", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "choose" });
    expect(result.current.state).toMatchObject({ status: "choosing", rows: [row(1), row(2), row(3)], total: null, page: 1, query: "a" });
  });

  it("returns notFound for zero results", async () => {
    const { result } = setup(async () => []);
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("zzz", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "notFound", query: "zzz", emptyMessage: undefined });
    expect(result.current.state.status).toBe("idle");
  });

  it("forwards the server emptyMessage", async () => {
    const { result } = setup(async () => ({ items: [], total: 0, emptyMessage: "nada" }));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("zzz", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "notFound", query: "zzz", emptyMessage: "nada" });
  });

  it("returns queryRequired for an empty browse that comes back empty", async () => {
    const { result } = setup(async () => []);
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("", { intent: "browse" });
    });
    expect(outcome).toEqual({ type: "queryRequired" });
    expect(result.current.state.status).toBe("idle");
  });

  it("returns notFound for a non-empty browse that comes back empty", async () => {
    const { result } = setup(async () => []);
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("x", { intent: "browse" });
    });
    expect(outcome).toMatchObject({ type: "notFound", query: "x" });
  });

  it("keeps total from a server response and pages against the server keeping query and criterion", async () => {
    const search = vi.fn<Search>(async (_q, ctx) => ({ items: [row(ctx.page)], total: 500 }));
    const { result } = setup(search);
    await act(async () => {
      await result.current.runSearch("ab", { intent: "browse", criterion: "code" });
    });
    expect(result.current.state.total).toBe(500);
    expect(search).toHaveBeenLastCalledWith("ab", expect.objectContaining({ page: 1, pageSize: 50, criterion: "code" }));
    await act(async () => {
      await result.current.goToPage(3);
    });
    expect(search).toHaveBeenLastCalledWith("ab", { page: 3, pageSize: 50, criterion: "code", signal: expect.any(AbortSignal) });
    expect(result.current.state).toMatchObject({ page: 3, rows: [row(3)], total: 500, status: "choosing", query: "ab", criterion: "code" });
  });

  it("keeps the last pageSize when goToPage is called without one", async () => {
    const search = vi.fn<Search>(async (_q, ctx) => ({ items: [row(ctx.page)], total: 500 }));
    const { result } = setup(search);
    await act(async () => {
      await result.current.runSearch("", { intent: "browse" });
    });
    await act(async () => {
      await result.current.goToPage(2, 20);
    });
    expect(search).toHaveBeenLastCalledWith("", expect.objectContaining({ page: 2, pageSize: 20 }));
    await act(async () => {
      await result.current.goToPage(3);
    });
    expect(search).toHaveBeenLastCalledWith("", expect.objectContaining({ page: 3, pageSize: 20 }));
  });

  it("does not call search again when paginating a client-side array", async () => {
    const search = vi.fn<Search>(async () => [row(1), row(2)]);
    const { result } = setup(search);
    await act(async () => {
      await result.current.runSearch("a", { intent: "commit" });
    });
    await act(async () => {
      await result.current.goToPage(2);
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(result.current.state.page).toBe(2);
  });

  it("lets the second search win and aborts the first", async () => {
    const first = deferred<LookupSearchResponse<Row>>();
    const second = deferred<LookupSearchResponse<Row>>();
    const signals: AbortSignal[] = [];
    const queue = [first, second];
    const onSearchError = vi.fn();
    const { result } = setup(
      (_q, ctx) => {
        signals.push(ctx.signal);
        return queue.shift()!.promise;
      },
      { onSearchError },
    );
    let p1!: Promise<unknown>;
    let p2!: Promise<unknown>;
    act(() => {
      p1 = result.current.runSearch("a", { intent: "commit" });
      p2 = result.current.runSearch("b", { intent: "commit" });
    });
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    await act(async () => {
      second.resolve([row(2), row(3)]);
      await p2;
    });
    await act(async () => {
      first.resolve([row(9)]);
      expect(await p1).toEqual({ type: "aborted" });
    });
    expect(result.current.state).toMatchObject({ rows: [row(2), row(3)], query: "b", status: "choosing" });
  });

  it("ignores a late rejection from a stale request", async () => {
    const first = deferred<LookupSearchResponse<Row>>();
    const queue = [first.promise, Promise.resolve([row(1), row(2)])];
    const onSearchError = vi.fn();
    const { result } = setup(() => queue.shift()!, { onSearchError });
    let p1!: Promise<unknown>;
    await act(async () => {
      p1 = result.current.runSearch("a", { intent: "commit" });
      await result.current.runSearch("b", { intent: "commit" });
    });
    await act(async () => {
      first.reject(new Error("late"));
      expect(await p1).toEqual({ type: "aborted" });
    });
    expect(onSearchError).not.toHaveBeenCalled();
    expect(result.current.state.query).toBe("b");
  });

  it("reports an error, restores the previous status and keeps rows", async () => {
    const boom = new Error("boom");
    const onSearchError = vi.fn();
    let fail = false;
    const { result } = setup(
      async () => {
        if (fail) throw boom;
        return [row(1), row(2)];
      },
      { onSearchError },
    );
    await act(async () => {
      await result.current.runSearch("a", { intent: "commit" });
    });
    fail = true;
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("b", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "error", error: boom });
    expect(onSearchError).toHaveBeenCalledTimes(1);
    expect(onSearchError).toHaveBeenCalledWith(boom);
    expect(result.current.state).toMatchObject({ status: "choosing", rows: [row(1), row(2)], query: "a" });
  });

  it("keeps rows, page and choosing status when goToPage fails", async () => {
    let fail = false;
    const { result } = setup(async (_q, ctx) => {
      if (fail) throw new Error("x");
      return { items: [row(ctx.page)], total: 100 };
    });
    await act(async () => {
      await result.current.runSearch("a", { intent: "browse" });
    });
    fail = true;
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.goToPage(2);
    });
    expect(outcome).toMatchObject({ type: "error" });
    expect(result.current.state).toMatchObject({ status: "choosing", page: 1, rows: [row(1)] });
  });

  it("aborts a loading page when goToPage is called again", async () => {
    const d = [deferred<LookupSearchResponse<Row>>(), deferred<LookupSearchResponse<Row>>()];
    const signals: AbortSignal[] = [];
    let i = 0;
    const { result } = setup(async (_q, ctx) => {
      if (ctx.page === 1) return { items: [row(1)], total: 100 };
      signals.push(ctx.signal);
      return d[i++]!.promise;
    });
    await act(async () => {
      await result.current.runSearch("a", { intent: "browse" });
    });
    let p1!: Promise<unknown>;
    let p2!: Promise<unknown>;
    act(() => {
      p1 = result.current.goToPage(2);
      p2 = result.current.goToPage(3);
    });
    expect(signals[0]?.aborted).toBe(true);
    await act(async () => {
      d[1]!.resolve({ items: [row(3)], total: 100 });
      await p2;
      d[0]!.resolve({ items: [row(2)], total: 100 });
      expect(await p1).toEqual({ type: "aborted" });
    });
    expect(result.current.state).toMatchObject({ page: 3, rows: [row(3)] });
  });

  it("returns aborted and leaves state untouched when search resolves null", async () => {
    let first = true;
    const { result } = setup(async () => {
      if (first) {
        first = false;
        return [row(1), row(2)];
      }
      return null;
    });
    await act(async () => {
      await result.current.runSearch("a", { intent: "commit" });
    });
    const before = result.current.state;
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.runSearch("b", { intent: "commit" });
    });
    expect(outcome).toEqual({ type: "aborted" });
    expect(result.current.state).toEqual(before);
  });

  it("passes a Record query through untouched", async () => {
    const search = vi.fn<Search<Record<string, string>>>(async () => [row(1), row(2)]);
    const { result } = setup(search);
    await act(async () => {
      await result.current.runSearch({ code: "1", name: "x" }, { intent: "commit" });
    });
    expect(search).toHaveBeenCalledWith({ code: "1", name: "x" }, expect.objectContaining({ page: 1 }));
    expect(result.current.state.query).toEqual({ code: "1", name: "x" });
  });

  it("goes through searching while in flight", async () => {
    const d = deferred<LookupSearchResponse<Row>>();
    const { result } = setup(() => d.promise);
    let p!: Promise<unknown>;
    act(() => {
      p = result.current.runSearch("a", { intent: "commit" });
    });
    expect(result.current.state.status).toBe("searching");
    await act(async () => {
      d.resolve([row(1)]);
      await p;
    });
    expect(result.current.state.status).toBe("idle");
  });

  it("reads autoSelectSingle at call time and keeps identities with inline callbacks", async () => {
    let auto = true;
    const { result, rerender } = renderHook(() =>
      useLookupController<Row, string>({ search: async () => [row(1)], pageSize: 50, autoSelectSingle: auto, onSearchError: () => {} }),
    );
    const { runSearch, goToPage, close } = result.current;
    auto = false;
    rerender();
    expect(result.current.runSearch).toBe(runSearch);
    expect(result.current.goToPage).toBe(goToPage);
    expect(result.current.close).toBe(close);
    await act(async () => {
      expect(await runSearch("a", { intent: "commit" })).toEqual({ type: "choose" });
    });
  });

  it("close resets to idle and aborts the request in flight", async () => {
    const d = deferred<LookupSearchResponse<Row>>();
    let signal!: AbortSignal;
    const { result } = setup((_q, ctx) => {
      signal = ctx.signal;
      return d.promise;
    });
    let p!: Promise<unknown>;
    act(() => {
      p = result.current.runSearch("a", { intent: "commit" });
    });
    act(() => result.current.close());
    expect(signal.aborted).toBe(true);
    expect(result.current.state.status).toBe("idle");
    await act(async () => {
      d.resolve([row(1), row(2)]);
      expect(await p).toEqual({ type: "aborted" });
    });
    expect(result.current.state.status).toBe("idle");
  });

  it("aborts on unmount and does not dispatch afterwards", async () => {
    const d = deferred<LookupSearchResponse<Row>>();
    let signal!: AbortSignal;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = setup((_q, ctx) => {
      signal = ctx.signal;
      return d.promise;
    });
    let p!: Promise<unknown>;
    act(() => {
      p = result.current.runSearch("a", { intent: "commit" });
    });
    unmount();
    expect(signal.aborted).toBe(true);
    d.resolve([row(1), row(2)]);
    expect(await p).toEqual({ type: "aborted" });
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("useLookupController local", () => {
  const items = [row(1), row(2), row(3)];

  it("chooses on commit with the localMatch rows even for 0 or 1 rows", async () => {
    const localMatch = vi.fn((q: string) => (q === "none" ? [] : q === "one" ? [row(1)] : items));
    const { result } = renderHook(() => useLookupController<Row, string>({ items, localMatch, pageSize: 50, autoSelectSingle: true }));
    await act(async () => {
      expect(await result.current.runSearch("one", { intent: "commit" })).toEqual({ type: "choose" });
    });
    expect(result.current.state).toMatchObject({ status: "choosing", rows: [row(1)] });
    await act(async () => {
      expect(await result.current.runSearch("none", { intent: "commit" })).toEqual({ type: "choose" });
    });
    expect(result.current.state.rows).toEqual([]);
  });

  it("browse with an empty query shows all items", async () => {
    const localMatch = vi.fn(() => [row(1)]);
    const { result } = renderHook(() => useLookupController<Row, string>({ items, localMatch, pageSize: 50, autoSelectSingle: true }));
    await act(async () => {
      expect(await result.current.runSearch("", { intent: "browse" })).toEqual({ type: "choose" });
    });
    expect(result.current.state.rows).toEqual(items);
    expect(localMatch).not.toHaveBeenCalled();
  });

  it("goToPage only changes the page", async () => {
    const { result } = renderHook(() => useLookupController<Row, string>({ items, localMatch: () => items, pageSize: 2, autoSelectSingle: true }));
    await act(async () => {
      await result.current.runSearch("", { intent: "browse" });
    });
    await act(async () => {
      await result.current.goToPage(2);
    });
    expect(result.current.state).toMatchObject({ page: 2, rows: items, status: "choosing" });
  });
});
