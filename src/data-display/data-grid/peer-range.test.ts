import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("peer de TanStack", () => {
  it("no admite la v9, que elimina los row models usados por DataGrid", () => {
    const { peerDependencies } = JSON.parse(readFileSync("package.json", "utf8")) as { peerDependencies: Record<string, string> };
    expect(peerDependencies["@tanstack/react-table"]).toBe("^8.20.0");
  });
});
