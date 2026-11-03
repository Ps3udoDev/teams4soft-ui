// Instala el paquete en un proyecto vacío, sin lockfile ni peers fijados, y comprueba
// que carga y renderiza en ESM y CJS. Las pruebas del repo no detectan estos fallos
// porque usan las versiones de sus devDependencies.
//
// Uso: node scripts/verify-clean-install.mjs [tarball]
// REACT_VERSION elige la mayor de React que instala el consumidor (19 por defecto).
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PACKAGE = "@teams4soft/teams4soft-ui";
const SUBPATHS = ["primitives", "forms", "layout", "feedback", "data-display", "overlays"];
const REQUIRE_SUBPATHS = ["primitives", "forms", "layout", "feedback", "overlays"];
const react = process.env.REACT_VERSION ?? "19";
const dir = mkdtempSync(join(tmpdir(), "t4s-clean-install-"));

const run = (command, cwd) => execSync(command, { cwd, stdio: "inherit" });

const checks = `
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const noop = () => {};

async function verify(load, format) {
  const React = await load("react");
  const { renderToString } = await load("react-dom/server");
  const h = React.createElement;
  const root = await load("${PACKAGE}");
  for (const subpath of ${JSON.stringify(SUBPATHS)}) {
    const mod = await load("${PACKAGE}/" + subpath);
    assert(Object.keys(mod).length > 0, "subpath vacío: " + subpath);
  }
  const cases = {
    Button: h(root.Button, null, "contenido-button"),
    Dialog: h(root.Dialog, { open: false, title: "Diálogo" }),
    DateField: h(root.DateField, { label: "contenido-fecha", value: null, onChange: noop }),
    SearchableSelectField: h(root.SearchableSelectField, {
      label: "contenido-select",
      options: [{ id: "a", name: "Uno" }],
      value: null,
      onChange: noop,
      getOptionValue: option => option.id,
      getOptionLabel: option => option.name,
    }),
    DataGrid: h(root.DataGrid, {
      columns: [{ field: "name", header: "Nombre" }],
      value: [{ id: "1", name: "contenido-grid" }],
      getRowId: row => row.id,
    }),
  };
  for (const [name, element] of Object.entries(cases)) renderToString(element);
  assert(renderToString(cases.DataGrid).includes("contenido-grid"), "DataGrid sin filas");
  assert(renderToString(cases.Button).includes("contenido-button"), "Button sin contenido");
  console.log(format + ": raíz, subpaths y render correctos con React " + React.version);
}
`;

const requireChecks = `
for (const subpath of ${JSON.stringify(REQUIRE_SUBPATHS)}) {
  const mod = require("${PACKAGE}/" + subpath);
  if (Object.keys(mod).length === 0) throw new Error("subpath vacío: " + subpath);
}
console.log("require sin require(esm): ${REQUIRE_SUBPATHS.join(", ")} correctos");
`;

try {
  const tarball = process.argv[2] ? resolve(process.argv[2]) : pack();
  const install = (cwd, extra = "") => {
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "clean-install", private: true }));
    run(`npm install --no-audit --no-fund --no-package-lock "${tarball}" react@${react} react-dom@${react} ${extra}`, cwd);
  };

  install(dir);
  writeFileSync(join(dir, "check.mjs"), `${checks}
await verify(id => import(id), "ESM");
`);
  writeFileSync(join(dir, "check.cjs"), `${checks}
verify(async id => require(id), "CJS").catch(error => { console.error(error); process.exit(1); });
`);
  run("node check.mjs", dir);
  run("node check.cjs", dir);
  // Sin require(esm), los subpaths que no usan TanStack deben cargar con un require clásico.
  writeFileSync(join(dir, "check-require.cjs"), requireChecks);
  run("node --no-experimental-require-module check-require.cjs", dir);

  // Un consumidor con su propio TanStack 8 no debe romper la librería ni ser sustituido por ella.
  const consumerV8 = mkdtempSync(join(tmpdir(), "t4s-clean-install-tanstack8-"));
  try {
    install(consumerV8, "@tanstack/react-table@8");
    writeFileSync(join(consumerV8, "check.mjs"), `${checks}
await verify(id => import(id), "ESM con TanStack 8 en la raíz");
`);
    run("node check.mjs", consumerV8);
  } finally {
    rmSync(consumerV8, { recursive: true, force: true });
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function pack() {
  execSync(`pnpm pack --pack-destination "${dir}"`, { stdio: "ignore" });
  const file = readdirSync(dir).find(name => name.endsWith(".tgz"));
  return join(dir, file);
}
