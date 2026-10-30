import * as React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoadingProvider } from "./LoadingProvider";
import { defaultLoadingStore, loading, releaseGlobalLoadingStore } from "./loading-global";

afterEach(() => { cleanup(); releaseGlobalLoadingStore(); vi.restoreAllMocks(); });

describe("LoadingProvider", () => {
  it("renders one blocking viewport overlay until every operation hides", () => {
    render(<LoadingProvider global><span>children</span></LoadingProvider>);
    expect(screen.getByText("children")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => { loading.show("one"); loading.show({ message: "Generando…", indicator: <span data-testid="excel" /> }); loading.hide(); });
    const overlay = screen.getByRole("status");
    expect(overlay).toHaveAttribute("data-target", "viewport");
    expect(overlay).toHaveAttribute("data-blocking", "true");
    expect(overlay).toHaveTextContent("Generando…");
    expect(screen.getByTestId("excel")).toBeInTheDocument();
    act(() => { loading.hide(); loading.hide(); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(defaultLoadingStore.getState().count).toBe(0);
  });

  it("claims before child passive effects and works under StrictMode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    function Child() {
      React.useEffect(() => { loading.show("child"); return () => loading.hide(); }, []);
      return null;
    }
    const view = render(<React.StrictMode><LoadingProvider global><Child /></LoadingProvider></React.StrictMode>);
    expect(screen.getByRole("status")).toHaveTextContent("child");
    expect(defaultLoadingStore.getState().count).toBe(1);
    expect(warn).not.toHaveBeenCalled();
    view.unmount();
    expect(defaultLoadingStore.getState().count).toBe(0);
  });

  it("does not duplicate overlays or clear the owner's count when duplicate unmounts", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    function View({ duplicate }: { duplicate: boolean }) {
      return <><LoadingProvider global />{duplicate ? <LoadingProvider global /> : null}</>;
    }
    const view = render(<View duplicate />);
    act(() => loading.show("busy"));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    view.rerender(<View duplicate={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("busy");
    view.unmount();
    expect(defaultLoadingStore.getState()).toEqual({ count: 0 });
  });

  it("non-global providers do not claim or render the importable API", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<LoadingProvider><span>private</span></LoadingProvider>);
    act(() => loading.show("global"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("releases after child cleanup and a new provider can reclaim immediately", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = render(<LoadingProvider global />);
    act(() => loading.show("first"));
    first.unmount();
    const next = render(<LoadingProvider global />);
    act(() => loading.show("next"));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("status")).toHaveTextContent("next");
    expect(warn).not.toHaveBeenCalled();
    next.unmount();
    await Promise.resolve();
    loading.show("no owner");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
