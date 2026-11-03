import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

describe("tokens del DataGrid", () => {
  it.each([
    "--ui-grid-header-bg",
    "--ui-grid-header-fg",
    "--ui-grid-row-alt",
    "--ui-grid-row-hover",
    "--ui-grid-row-selected",
    "--ui-grid-cell-invalid",
    "--ui-grid-font",
    "--ui-grid-row-height",
    "--ui-grid-row-height-compact",
    "--ui-overlay",
    "--ui-shadow-lg",
    "--ui-radius-lg",
  ])("define %s", (token) => {
    expect(css).toMatch(new RegExp(String.raw`^\s*${token}\s*:`, "m"));
  });
});
