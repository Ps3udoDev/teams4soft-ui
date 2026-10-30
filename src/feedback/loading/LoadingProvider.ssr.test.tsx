// @vitest-environment node
import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoadingProvider } from "./LoadingProvider";
import { loading, releaseGlobalLoadingStore } from "./loading-global";

describe("LoadingProvider SSR", () => {
  it("renders children without claiming a client provider or exposing a loading snapshot", () => {
    releaseGlobalLoadingStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = renderToString(<LoadingProvider global><p>Server content</p></LoadingProvider>);
      expect(html).toContain("Server content");
      expect(html).not.toContain("aria-busy");
      expect(error).not.toHaveBeenCalled();
      loading.show("client-only API without provider");
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      releaseGlobalLoadingStore();
      warn.mockRestore();
      error.mockRestore();
    }
  });
});
