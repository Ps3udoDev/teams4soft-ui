import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    primitives: "src/primitives/index.ts",
    forms: "src/forms/index.ts",
    layout: "src/layout/index.ts",
    feedback: "src/feedback/index.ts",
  },
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
    /^@radix-ui\//,
    "@tanstack/react-table",
    "@floating-ui/react",
  ],
});
