# Fase 0 — Infraestructura de `@teams4soft/teams4soft-ui` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repositorio de la librería compilando, testeable, documentado con Storybook y publicable en npm (en vacío, exportando solo utilidades), con CI y seguridad automatizadas en GitHub Actions.

**Architecture:** Librería React + TypeScript. El JS/TS se compila con `tsup` (ESM + CJS + tipos). El CSS se compila **aparte** con el CLI de Tailwind v4 (`dist/styles.css` + `dist/tokens.css`), porque tsup no procesa CSS. Las clases custom del consumidor se resuelven con `cn` (clsx + tailwind-merge). Storybook usa el builder react-vite. Tres workflows de GitHub Actions cubren CI, seguridad (supply chain) y release.

**Tech Stack:** pnpm, TypeScript (strict), tsup, Tailwind CSS v4 (`@tailwindcss/cli`), clsx, tailwind-merge, class-variance-authority, Vitest, Testing Library, Storybook (react-vite) + addon-a11y, GitHub Actions, npm (publish con provenance).

## Global Constraints

- Gestor de paquetes: **pnpm**. Instalación en CI siempre con `--frozen-lockfile`.
- Nombre del paquete: **`@teams4soft/teams4soft-ui`**. Organización npm `@teams4soft` ya creada.
- React como **peerDependency** `>=18.0.0` (nunca en `dependencies`).
- `package.json` debe tener `"files": ["dist"]` (allowlist) y `"sideEffects": ["*.css"]`.
- Peer deps de comportamiento (Radix, `@tanstack/react-table`, etc.) van en `peerDependencies`, nunca en `dependencies`; y en `external` de tsup.
- Nunca publicar `src/`, config de Storybook, `.env` ni secretos. Verificar con `pnpm publish --dry-run --no-git-checks` en CI (pnpm 9.0.0 no soporta `pnpm pack --dry-run`).
- Tokens semánticos con prefijo `--ui-*`; ningún color de producto hardcodeado.
- Nombres de API en inglés; documentación en español.
- Acciones de GitHub **pinneadas por SHA** (ver Task 8 para el procedimiento de pinning).
- TypeScript `strict: true`; sin `any` en API pública.

---

## Estructura de archivos (Fase 0)

```text
teams4soft-ui/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── .gitignore
├── .npmrc
├── README.md
├── LICENSE
├── src/
│   ├── index.ts                 # barrel: reexporta utilidades de lib/
│   ├── lib/
│   │   ├── cn.ts                # cn(...): clsx + tailwind-merge
│   │   ├── cn.test.ts
│   │   ├── compose-event-handlers.ts
│   │   ├── compose-event-handlers.test.ts
│   │   ├── merge-refs.ts
│   │   ├── merge-refs.test.ts
│   │   └── index.ts             # barrel de lib
│   └── styles/
│       ├── tokens.css           # :root { --ui-*: ... }  (copiable a dist)
│       └── theme.css            # input de Tailwind v4 (@import tailwindcss + @theme)
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── src/Intro.stories.tsx        # story smoke
└── .github/workflows/
    ├── ci.yml
    ├── security.yml
    └── release.yml
```

---

### Task 1: Scaffolding del proyecto (pnpm + TypeScript estricto)

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.npmrc`

**Interfaces:**
- Consumes: nada (primer task).
- Produces: `pnpm install` funcional; `pnpm typecheck` disponible; base de `package.json` con nombre, peer deps de React, `files`, `sideEffects`.

- [ ] **Step 1: Inicializar pnpm y crear `package.json`**

Crear `package.json` con este contenido exacto:

```json
{
  "name": "@teams4soft/teams4soft-ui",
  "version": "0.0.0",
  "description": "Librería de componentes UI de Teams4Soft: React + TypeScript, tematizable y accesible.",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Crear `.npmrc`**

```ini
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 3: Crear `.gitignore`**

```gitignore
node_modules/
dist/
storybook-static/
coverage/
*.log
.DS_Store
.env
.env.*
!.env.example
```

- [ ] **Step 4: Instalar TypeScript y tipos de React (dev)**

Run:
```bash
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D react react-dom
```
Nota: React se instala como **dev** (para tests/Storybook); en `peerDependencies` sigue siendo `>=18`.

- [ ] **Step 5: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "storybook-static"]
}
```

- [ ] **Step 6: Verificar typecheck en vacío**

Crear un `src/index.ts` temporal con `export {};` y correr:
```bash
pnpm typecheck
```
Expected: sin errores (exit 0).

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore .npmrc pnpm-lock.yaml src/index.ts
git commit -m "chore: scaffold pnpm + strict typescript"
```

---

### Task 2: Utilidad `cn` (clsx + tailwind-merge) con TDD

**Files:**
- Create: `src/lib/cn.ts`, `src/lib/cn.test.ts`, `vitest.config.ts`, `vitest.setup.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `cn(...inputs: ClassValue[]): string` — combina clases y resuelve conflictos de Tailwind dando prioridad a las **últimas** (las del consumidor).

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
pnpm add clsx tailwind-merge
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Nota: `clsx` y `tailwind-merge` van en `dependencies` (son runtime, ligeras, sin conflicto de versiones).

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 3: Crear `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Escribir el test que falla — `src/lib/cn.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("combina clases simples", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("ignora valores falsy", () => {
    expect(cn("px-2", false, null, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("resuelve conflictos de Tailwind dando prioridad a la última clase", () => {
    // la clase custom del consumidor (rounded-none) debe ganar
    expect(cn("rounded-md", "rounded-none")).toBe("rounded-none");
  });

  it("acepta arrays y objetos condicionales", () => {
    expect(cn(["px-2", { "py-1": true, hidden: false }])).toBe("px-2 py-1");
  });
});
```

- [ ] **Step 5: Correr el test y verificar que FALLA**

Run:
```bash
pnpm exec vitest run src/lib/cn.test.ts
```
Expected: FAIL — `Failed to resolve import "./cn"` / módulo no encontrado.

- [ ] **Step 6: Implementar `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades
 * Tailwind (tailwind-merge). Las clases pasadas al final tienen prioridad,
 * de modo que las clases custom del consumidor sobrescriben las internas.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Correr el test y verificar que PASA**

Run:
```bash
pnpm exec vitest run src/lib/cn.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 8: Añadir scripts de test a `package.json`**

En `"scripts"` agregar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/cn.ts src/lib/cn.test.ts vitest.config.ts vitest.setup.ts package.json pnpm-lock.yaml
git commit -m "feat(lib): add cn utility (clsx + tailwind-merge) with tests"
```

---

### Task 3: Utilidades de composición (`composeEventHandlers`, `mergeRefs`) con TDD

**Files:**
- Create: `src/lib/compose-event-handlers.ts`, `src/lib/compose-event-handlers.test.ts`, `src/lib/merge-refs.ts`, `src/lib/merge-refs.test.ts`, `src/lib/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `composeEventHandlers<E extends { defaultPrevented: boolean }>(theirHandler: ((event: E) => void) | undefined, ourHandler: (event: E) => void, options?: { checkForDefaultPrevented?: boolean }): (event: E) => void`
  - `mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): (node: T | null) => void`
  - `src/lib/index.ts` reexporta `cn`, `composeEventHandlers`, `mergeRefs`.

- [ ] **Step 1: Escribir el test que falla — `src/lib/compose-event-handlers.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { composeEventHandlers } from "./compose-event-handlers";

type FakeEvent = { defaultPrevented: boolean };

describe("composeEventHandlers", () => {
  it("llama primero al handler externo y luego al interno", () => {
    const order: string[] = [];
    const theirs = () => order.push("theirs");
    const ours = () => order.push("ours");
    const handler = composeEventHandlers<FakeEvent>(theirs, ours);
    handler({ defaultPrevented: false });
    expect(order).toEqual(["theirs", "ours"]);
  });

  it("no llama al interno si el externo previno el default", () => {
    const ours = vi.fn();
    const theirs = (e: FakeEvent) => {
      e.defaultPrevented = true;
    };
    const handler = composeEventHandlers<FakeEvent>(theirs, ours);
    handler({ defaultPrevented: false });
    expect(ours).not.toHaveBeenCalled();
  });

  it("sí llama al interno si checkForDefaultPrevented es false", () => {
    const ours = vi.fn();
    const theirs = (e: FakeEvent) => {
      e.defaultPrevented = true;
    };
    const handler = composeEventHandlers<FakeEvent>(theirs, ours, {
      checkForDefaultPrevented: false,
    });
    handler({ defaultPrevented: false });
    expect(ours).toHaveBeenCalledOnce();
  });

  it("funciona sin handler externo", () => {
    const ours = vi.fn();
    const handler = composeEventHandlers<FakeEvent>(undefined, ours);
    handler({ defaultPrevented: false });
    expect(ours).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Correr y verificar que FALLA**

Run:
```bash
pnpm exec vitest run src/lib/compose-event-handlers.test.ts
```
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `src/lib/compose-event-handlers.ts`**

```ts
/**
 * Compone un handler externo (del consumidor) con uno interno del componente.
 * El externo corre primero; si previene el default, el interno no se ejecuta
 * (salvo que checkForDefaultPrevented sea false).
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
  { checkForDefaultPrevented = true }: { checkForDefaultPrevented?: boolean } = {},
): (event: E) => void {
  return function handleEvent(event: E) {
    theirHandler?.(event);
    if (!checkForDefaultPrevented || !event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
```

- [ ] **Step 4: Correr y verificar que PASA**

Run:
```bash
pnpm exec vitest run src/lib/compose-event-handlers.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Escribir el test que falla — `src/lib/merge-refs.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { mergeRefs } from "./merge-refs";

describe("mergeRefs", () => {
  it("asigna el nodo a una ref de callback y a una ref de objeto", () => {
    const callbackRef = vi.fn();
    const objectRef = { current: null as string | null };
    const merged = mergeRefs<string>(callbackRef, objectRef);
    merged("node");
    expect(callbackRef).toHaveBeenCalledWith("node");
    expect(objectRef.current).toBe("node");
  });

  it("ignora refs undefined o null", () => {
    const objectRef = { current: null as string | null };
    const merged = mergeRefs<string>(undefined, null, objectRef);
    merged("node");
    expect(objectRef.current).toBe("node");
  });
});
```

- [ ] **Step 6: Correr y verificar que FALLA**

Run:
```bash
pnpm exec vitest run src/lib/merge-refs.test.ts
```
Expected: FAIL — módulo no encontrado.

- [ ] **Step 7: Implementar `src/lib/merge-refs.ts`**

```ts
import type { Ref, RefCallback, MutableRefObject } from "react";

/**
 * Combina varias refs (callback u objeto) en una sola ref de callback,
 * para reenviar el nodo a todas ellas.
 */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref != null) {
        (ref as MutableRefObject<T | null>).current = node;
      }
    }
  };
}
```

- [ ] **Step 8: Correr y verificar que PASA**

Run:
```bash
pnpm exec vitest run src/lib/merge-refs.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 9: Crear el barrel `src/lib/index.ts`**

```ts
export { cn } from "./cn";
export { composeEventHandlers } from "./compose-event-handlers";
export { mergeRefs } from "./merge-refs";
```

- [ ] **Step 10: Correr toda la suite**

Run:
```bash
pnpm test
```
Expected: PASS (todos los tests de lib).

- [ ] **Step 11: Commit**

```bash
git add src/lib/compose-event-handlers.ts src/lib/compose-event-handlers.test.ts src/lib/merge-refs.ts src/lib/merge-refs.test.ts src/lib/index.ts
git commit -m "feat(lib): add composeEventHandlers and mergeRefs with tests"
```

---

### Task 4: Build de JS/TS con `tsup`

**Files:**
- Create: `tsup.config.ts`
- Modify: `src/index.ts` (barrel público), `package.json` (scripts)

**Interfaces:**
- Consumes: `src/lib/index.ts` (Task 3).
- Produces: `pnpm build:js` genera `dist/index.js` (ESM), `dist/index.cjs` (CJS) y `dist/index.d.ts`. Instala `class-variance-authority` para uso futuro de variantes.

- [ ] **Step 1: Instalar tsup y CVA**

Run:
```bash
pnpm add -D tsup
pnpm add class-variance-authority
```

- [ ] **Step 2: Reemplazar `src/index.ts` con el barrel público real**

```ts
export { cn, composeEventHandlers, mergeRefs } from "./lib";
```

- [ ] **Step 3: Crear `tsup.config.ts`**

```ts
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
```

- [ ] **Step 4: Añadir el script `build:js` a `package.json`**

En `"scripts"`:
```json
"build:js": "tsup"
```

- [ ] **Step 5: Correr el build y verificar salidas**

Run:
```bash
pnpm build:js
```
Expected: se genera `dist/` con `index.js`, `index.cjs`, `index.d.ts` (y `.map`). Verificar:
```bash
ls dist
```
Expected: `index.js  index.cjs  index.d.ts  index.js.map  index.cjs.map`

- [ ] **Step 6: Verificar que el tipo exportado es correcto**

Run:
```bash
node -e "import('./dist/index.js').then(m => console.log(typeof m.cn, typeof m.composeEventHandlers, typeof m.mergeRefs))"
```
Expected: `function function function`

- [ ] **Step 7: Commit**

```bash
git add tsup.config.ts src/index.ts package.json pnpm-lock.yaml
git commit -m "feat(build): add tsup config for esm/cjs/dts output"
```

---

### Task 5: Pipeline de CSS con Tailwind v4 (tokens + tema)

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/theme.css`
- Modify: `package.json` (exports + scripts)

**Interfaces:**
- Consumes: nada.
- Produces: `pnpm build:css` genera `dist/styles.css` (utilidades + tema compilados) y `dist/tokens.css` (variables `--ui-*` planas). Nuevos subpaths de export: `./styles.css`, `./tokens.css`.

- [ ] **Step 1: Instalar el CLI de Tailwind v4**

Run:
```bash
pnpm add -D tailwindcss @tailwindcss/cli
```

- [ ] **Step 2: Crear `src/styles/tokens.css` (variables planas, copiables)**

```css
/* Tokens semánticos de la librería. CSS plano: copiable directo a dist. */
:root {
  --ui-background: #ffffff;
  --ui-foreground: #0a0a0a;
  --ui-primary: #4f46e5;
  --ui-primary-foreground: #ffffff;
  --ui-muted: #f4f4f5;
  --ui-border: #e4e4e7;
  --ui-danger: #dc2626;
  --ui-focus: #4f46e5;
  --ui-radius-sm: 0.25rem;
  --ui-radius-md: 0.5rem;
}
```

- [ ] **Step 3: Crear `src/styles/theme.css` (input de Tailwind v4)**

```css
@import "tailwindcss";
@import "./tokens.css";

@theme {
  --color-ui-background: var(--ui-background);
  --color-ui-foreground: var(--ui-foreground);
  --color-ui-primary: var(--ui-primary);
  --color-ui-primary-foreground: var(--ui-primary-foreground);
  --color-ui-muted: var(--ui-muted);
  --color-ui-border: var(--ui-border);
  --color-ui-danger: var(--ui-danger);
  --color-ui-focus: var(--ui-focus);
  --radius-ui-sm: var(--ui-radius-sm);
  --radius-ui-md: var(--ui-radius-md);
}

/* Fuerza a Tailwind a generar utilidades base aunque aún no haya componentes.
   Se ampliará cuando existan clases en los componentes. */
@source inline("{bg,text,border}-ui-{background,foreground,primary,muted,border,danger}");
```

- [ ] **Step 4: Añadir scripts de CSS a `package.json`**

En `"scripts"`:
```json
"build:css": "tailwindcss -i src/styles/theme.css -o dist/styles.css --minify && node -e \"require('fs').copyFileSync('src/styles/tokens.css','dist/tokens.css')\"",
"build": "pnpm build:js && pnpm build:css"
```

- [ ] **Step 5: Añadir los subpaths de CSS a `exports` en `package.json`**

Reemplazar el bloque `"exports"` por:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "require": "./dist/index.cjs"
  },
  "./styles.css": "./dist/styles.css",
  "./tokens.css": "./dist/tokens.css"
}
```

- [ ] **Step 6: Correr el build completo y verificar CSS**

Run:
```bash
pnpm build
ls dist
```
Expected: además de los `.js/.cjs/.d.ts`, existen `styles.css` y `tokens.css`.

- [ ] **Step 7: Verificar que `dist/tokens.css` contiene las variables**

Run:
```bash
node -e "const c=require('fs').readFileSync('dist/tokens.css','utf8'); if(!c.includes('--ui-primary')) throw new Error('faltan tokens'); console.log('tokens ok')"
```
Expected: `tokens ok`

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/theme.css package.json pnpm-lock.yaml
git commit -m "feat(styles): add tailwind v4 css pipeline (tokens + theme)"
```

---

### Task 6: `package.json` de publicación + verificación `pack --dry-run`

**Files:**
- Modify: `package.json`
- Create: `README.md`, `LICENSE`

**Interfaces:**
- Consumes: `dist/` de Tasks 4 y 5.
- Produces: `pnpm pack --dry-run` mostrando SOLO archivos de `dist/` (+ package.json/README/LICENSE). Script `prepublishOnly` que reconstruye antes de publicar.

- [ ] **Step 1: Añadir `prepublishOnly` a `package.json`**

En `"scripts"`:
```json
"prepublishOnly": "pnpm build"
```

- [ ] **Step 2: Crear `LICENSE` (MIT)**

```text
MIT License

Copyright (c) 2026 Teams4Soft

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Crear `README.md`**

```markdown
# @teams4soft/teams4soft-ui

Librería de componentes UI de Teams4Soft: React + TypeScript, tematizable, accesible y neutra.

## Instalación

\`\`\`bash
pnpm add @teams4soft/teams4soft-ui
\`\`\`

Importa los estilos una vez en el punto de entrada de tu app:

\`\`\`ts
import "@teams4soft/teams4soft-ui/styles.css";
\`\`\`

## Utilidades

- `cn(...classes)` — combina clases y resuelve conflictos de Tailwind (las últimas ganan).
- `composeEventHandlers(theirs, ours)` — compone handlers respetando `preventDefault`.
- `mergeRefs(...refs)` — combina varias refs en una.

## Estado

En construcción por fases. Ver `docs/superpowers/plans/`.
```

- [ ] **Step 4: Ejecutar `pack --dry-run` y verificar el contenido del tarball**

Run:
```bash
pnpm build
pnpm pack --dry-run
```
Expected: la lista incluye únicamente `package.json`, `README.md`, `LICENSE` y archivos bajo `dist/`. **No debe aparecer** nada bajo `src/`, `.storybook/`, `.github/`, ni `*.test.*`.

- [ ] **Step 5: Verificación automatizada del tarball (guard anti-fugas)**

Run:
```bash
node -e "const {execSync}=require('child_process'); const out=execSync('pnpm pack --dry-run --json').toString(); if(/\/src\/|\.test\.|\.storybook\/|\.env/.test(out)) { throw new Error('FUGA: el tarball incluye archivos prohibidos'); } console.log('tarball limpio');"
```
Expected: `tarball limpio`
(Si `--json` no está soportado en la versión de pnpm, usar `pnpm pack --dry-run 2>&1` y validar el texto.)

- [ ] **Step 6: Commit**

```bash
git add package.json README.md LICENSE
git commit -m "chore(publish): add prepublishOnly, README, LICENSE and verify pack contents"
```

---

### Task 7: Storybook (react-vite) + addon de accesibilidad

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.ts`, `src/Intro.stories.tsx`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `dist/styles.css` (se importa en preview) y `src/index.ts`.
- Produces: `pnpm storybook` levanta en :6006; `pnpm build-storybook` genera `storybook-static/`; addon-a11y activo.

- [ ] **Step 1: Inicializar Storybook con el builder react-vite**

Run:
```bash
pnpm dlx storybook@latest init --builder vite --yes
```
Nota: esto crea `.storybook/`, instala Storybook 8/9 y añade scripts `storybook` y `build-storybook`. Si el init crea historias de ejemplo en `src/stories/`, eliminarlas al final de este task.

- [ ] **Step 2: Instalar el addon de accesibilidad**

Run:
```bash
pnpm add -D @storybook/addon-a11y
```

- [ ] **Step 3: Reemplazar `.storybook/main.ts`**

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
```
Nota: si el init generó `addons` con `@storybook/addon-essentials` u otros, conservarlos y **añadir** `@storybook/addon-a11y` a la lista, no eliminarlos.

- [ ] **Step 4: Crear/actualizar `.storybook/preview.ts`**

```ts
import type { Preview } from "@storybook/react";
import "../dist/tokens.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
  },
};

export default preview;
```
Nota: se importa `../dist/tokens.css` para tener las variables `--ui-*` disponibles en las historias. Requiere haber corrido `pnpm build` antes de `pnpm storybook` (documentado en README de dev). Alternativamente importar `../src/styles/tokens.css` directamente para no depender del build.

- [ ] **Step 5: Crear una story smoke — `src/Intro.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { cn } from "./index";

const Intro = () => (
  <div className={cn("p-6")} style={{ color: "var(--ui-foreground)" }}>
    <h1 style={{ color: "var(--ui-primary)" }}>@teams4soft/teams4soft-ui</h1>
    <p>Infraestructura lista. Los componentes llegan en las siguientes fases.</p>
  </div>
);

const meta: Meta<typeof Intro> = {
  title: "Introducción/Bienvenida",
  component: Intro,
};
export default meta;

type Story = StoryObj<typeof Intro>;
export const Default: Story = {};
```

- [ ] **Step 6: Eliminar historias de ejemplo generadas por el init (si existen)**

Run:
```bash
node -e "const fs=require('fs'); if(fs.existsSync('src/stories')){fs.rmSync('src/stories',{recursive:true,force:true}); console.log('stories de ejemplo eliminadas');} else {console.log('sin stories de ejemplo');}"
```

- [ ] **Step 7: Verificar que Storybook compila (build headless)**

Run:
```bash
pnpm build-storybook
```
Expected: genera `storybook-static/` sin errores.

- [ ] **Step 8: Commit**

```bash
git add .storybook src/Intro.stories.tsx package.json pnpm-lock.yaml
git commit -m "feat(storybook): add react-vite storybook with a11y addon and intro story"
```

---

### Task 8: Workflow de CI (`ci.yml`)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts `typecheck`, `test`, `build` de `package.json`.
- Produces: pipeline que en push/PR corre typecheck → test → build → pack dry-run.

**Procedimiento de pinning por SHA (aplica a Tasks 8, 9, 10):** Las acciones se referencian aquí por tag para legibilidad. **Antes de commitear**, resolver cada tag a su SHA y reemplazar `@vX` por `@<sha> # vX`. Para resolver un SHA:
```bash
gh api repos/actions/checkout/commits/v4 --jq .sha
gh api repos/pnpm/action-setup/commits/v4 --jq .sha
gh api repos/actions/setup-node/commits/v4 --jq .sha
```
Dejar el comentario con el tag legible al lado del SHA.

- [ ] **Step 1: Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Typecheck
        run: pnpm typecheck
      - name: Test
        run: pnpm test
      - name: Build
        run: pnpm build
      - name: Verify package contents
        run: pnpm publish --dry-run --no-git-checks
```
Nota: pnpm 9.0.0 **no** soporta `pnpm pack --dry-run` (falla). `pnpm publish --dry-run` sí está soportado, empaqueta y lista el contenido del tarball **sin publicar** (no requiere token). Es la forma portable de la verificación anti-fugas.

- [ ] **Step 2: Pinear las acciones a SHA**

Aplicar el procedimiento de pinning descrito arriba a `actions/checkout`, `pnpm/action-setup` y `actions/setup-node`. Ejemplo de resultado:
```yaml
      - uses: actions/checkout@<sha> # v4
```

- [ ] **Step 3: Validar sintaxis YAML localmente**

Run:
```bash
node -e "const yaml=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!yaml.includes('pnpm install --frozen-lockfile')) throw new Error('falta frozen-lockfile'); console.log('ci.yml ok')"
```
Expected: `ci.yml ok`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test/typecheck workflow"
```

---

### Task 9: Workflow de seguridad (`security.yml`)

**Files:**
- Create: `.github/workflows/security.yml`

**Interfaces:**
- Consumes: `pnpm-lock.yaml`.
- Produces: pipeline con `pnpm audit`, dependency-review (en PR) y CodeQL.

- [ ] **Step 1: Crear `.github/workflows/security.yml`**

```yaml
name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Audit dependencies
        run: pnpm audit --audit-level high

  dependency-review:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high

  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
```

- [ ] **Step 2: Pinear todas las acciones a SHA**

Aplicar el procedimiento de pinning (Task 8) a `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/dependency-review-action` y las tres de `github/codeql-action`.

- [ ] **Step 3: Validar sintaxis**

Run:
```bash
node -e "const y=require('fs').readFileSync('.github/workflows/security.yml','utf8'); ['pnpm audit','dependency-review-action','codeql-action'].forEach(k=>{if(!y.includes(k))throw new Error('falta '+k)}); console.log('security.yml ok')"
```
Expected: `security.yml ok`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/security.yml
git commit -m "ci: add supply-chain security workflow (audit + dependency-review + codeql)"
```

---

### Task 10: Workflow de release (`release.yml`)

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: scripts `build`, `prepublishOnly`; secreto `NPM_TOKEN`.
- Produces: publicación a npm con provenance al crear un GitHub Release.

- [ ] **Step 1: Crear `.github/workflows/release.yml`**

```yaml
name: Release

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write # requerido para provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Publish to npm
        run: pnpm publish --access public --provenance --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Pinear acciones a SHA**

Aplicar el procedimiento de pinning (Task 8) a `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`.

- [ ] **Step 3: Documentar los requisitos del secreto en el README**

Añadir al final de `README.md`:
```markdown
## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Subir un tag y crear un GitHub Release → el workflow `release.yml` publica con provenance.
```

- [ ] **Step 4: Validar sintaxis**

Run:
```bash
node -e "const y=require('fs').readFileSync('.github/workflows/release.yml','utf8'); ['id-token: write','--provenance','NPM_TOKEN'].forEach(k=>{if(!y.includes(k))throw new Error('falta '+k)}); console.log('release.yml ok')"
```
Expected: `release.yml ok`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml README.md
git commit -m "ci: add npm release workflow with provenance"
```

---

### Task 11: Verificación final e integración

**Files:**
- Modify: ninguno nuevo (validación end-to-end)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: repo en verde, pusheado a `origin/main`.

- [ ] **Step 1: Instalación limpia desde cero**

Run:
```bash
rm -rf node_modules dist storybook-static
pnpm install --frozen-lockfile
```
Expected: instala sin errores.

- [ ] **Step 2: Correr toda la cadena de CI localmente**

Run:
```bash
pnpm typecheck && pnpm test && pnpm build && pnpm publish --dry-run --no-git-checks
```
Expected: los cuatro pasan; el tarball solo contiene `dist/`, `package.json`, `README.md`, `LICENSE`.

- [ ] **Step 3: Verificar Storybook**

Run:
```bash
pnpm build-storybook
```
Expected: `storybook-static/` generado sin errores.

- [ ] **Step 4: Commit del lockfile final (si cambió) y push**

```bash
git add -A
git commit -m "chore: finalize phase 0 infrastructure" --allow-empty
git push -u origin main
```
Expected: push exitoso; los workflows de CI y Security se disparan en GitHub y pasan en verde.

- [ ] **Step 5: Verificar el estado de los workflows en GitHub**

Run:
```bash
gh run list --limit 5
```
Expected: `CI` y `Security` en estado `completed / success`.

---

## Self-Review (cobertura del spec)

- **§3.1 tsup ESM/CJS/dts** → Task 4. ✅
- **§3.2 CSS Tailwind v4 (styles.css + tokens.css), sideEffects, cn** → Tasks 2 y 5; `sideEffects` en Task 1. ✅
- **§3.3 exports map** → Tasks 1 (`.`) y 5 (`./styles.css`, `./tokens.css`). Subpaths por categoría (`./forms`, etc.) se añaden cuando existan componentes (Fases 1–5), no en Fase 0. ✅ (diferido justificado)
- **§3.4 Storybook react-vite + a11y** → Task 7. ✅
- **§6 Testing lean (Vitest + TL + a11y)** → Tasks 2, 3 (Vitest/TL) y 7 (a11y). ✅
- **§7.1 ci.yml** → Task 8. ✅
- **§7.2 security.yml (audit + dependency-review + CodeQL)** → Task 9. ✅
- **§7.3 release.yml (provenance)** → Task 10. ✅
- **§8 files allowlist + pack --dry-run + peer deps** → Tasks 1 y 6. ✅
- **Global: SHA pinning** → procedimiento en Task 8, aplicado en 8/9/10. ✅

**Diferido a fases siguientes (fuera de Fase 0):** Playwright + regresión visual (spec §6), subpaths de export por categoría, y los ~20 componentes (Fases 1–5, cada uno con su plan).

**Placeholder scan:** sin TBD/TODO; el único valor resuelto externamente es el SHA de las acciones (procedimiento explícito con comando `gh api`).

**Consistencia de tipos:** `cn`, `composeEventHandlers`, `mergeRefs` mantienen la misma firma entre Tasks 2, 3, 4 y el barrel.
