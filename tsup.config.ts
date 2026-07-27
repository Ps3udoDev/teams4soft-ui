import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  clean: true,
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    // Peer deps de comportamiento (se añadirán al usarse):
    "@radix-ui/*",
    "@tanstack/react-table",
    "@floating-ui/react",
  ],
});
