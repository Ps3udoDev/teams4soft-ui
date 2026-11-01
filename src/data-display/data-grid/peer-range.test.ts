import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const { peerDependencies, devDependencies } = JSON.parse(readFileSync("package.json", "utf8")) as {
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const radixPeers = Object.keys(peerDependencies).filter(name => name.startsWith("@radix-ui/"));

describe("rangos de peers", () => {
  it("TanStack se limita a la v9: DataGrid registra sus features con la API de esa mayor", () => {
    expect(peerDependencies["@tanstack/react-table"]).toBe("^9.3.1");
    expect(devDependencies["@tanstack/react-table"]).toBe("^9.3.1");
  });

  it("React declara solo las mayores probadas en CI", () => {
    expect(peerDependencies.react).toBe("^18.3.0 || ^19.0.0");
    expect(peerDependencies["react-dom"]).toBe("^18.3.0 || ^19.0.0");
  });

  it("ningún peer queda abierto a mayores sin probar", () => {
    for (const range of Object.values(peerDependencies)) {
      expect(range).toMatch(/^\^\d/);
    }
  });

  it("cada peer de Radix usa como mínimo la versión con la que se prueba", () => {
    expect(radixPeers).toHaveLength(7);
    for (const name of radixPeers) {
      expect(peerDependencies[name]).toBe(devDependencies[name]);
    }
  });
});
