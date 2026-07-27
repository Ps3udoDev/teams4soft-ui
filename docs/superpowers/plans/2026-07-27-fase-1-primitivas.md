# Fase 1 — Primitivas P0 (Button, Tooltip, FormField, TextField) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar las cuatro primitivas P0 —`Button`, `Tooltip`, `FormField`, `TextField`— tipadas, accesibles, tematizables y con Storybook + pruebas, sobre la infraestructura de Fase 0.

**Architecture:** Cada componente sigue el "contrato universal de personalización" (`className`/`classNames`/`unstyled`/`style`/`styles`), expone estados con `data-*` + ARIA, reenvía `ref` y props DOM, y usa tokens `--ui-*`. `Button` = `<button>` nativo + `@radix-ui/react-slot` (`asChild`) + variantes CVA. `Tooltip` = `@radix-ui/react-tooltip`. `FormField` = contexto React ligero + `useId`. `TextField` = `<input>` nativo integrable con `FormField`. Se exponen subpaths `./primitives` y `./forms` para tree-shaking; el índice raíz reexporta todo.

**Tech Stack:** React ≥18, TypeScript estricto, tsup, Tailwind v4, `cn`/`composeEventHandlers`/`mergeRefs` (Fase 0), `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`, Vitest + Testing Library + `@testing-library/user-event`, Storybook 10 + a11y.

## Global Constraints

- Gestor: **pnpm**; CI con `--frozen-lockfile`.
- **Contrato universal** en TODO componente público: acepta `className`, `classNames` (por slot), `unstyled`, `style`, `styles`; las clases externas se combinan al final con `cn` (las del consumidor ganan); `unstyled` conserva comportamiento y accesibilidad pero quita clases visuales.
- Estados expuestos con `data-*` y atributos ARIA; `ref` reenviado al elemento relevante; props DOM válidas reenviadas sin sobrescribir handlers internos (componer con `composeEventHandlers`).
- Tokens semánticos `--ui-*`; **ningún color de producto hardcodeado**; sin anchos/`z-index` arbitrarios como props principales.
- API en inglés; documentación/comentarios en español. **Sin `any`** en la API pública. Variantes cerradas y tipadas. Iconos como `ReactNode`. `value`+`onValueChange` para valores; `open`+`onOpenChange` para overlays.
- **Radix y `@radix-ui/react-slot` van en `peerDependencies`** (nunca `dependencies`) y en `external` de tsup. `class-variance-authority` ya está en `dependencies` (Fase 0).
- Cada componente cumple la "definición de terminado": contrato TS exportado, sin deps de negocio, `className`/`classNames`/`unstyled`/`style`/`styles`, tokens, controlado y (cuando aplique) no controlado, operable por teclado, historias + pruebas unit/interacción/a11y, doc de migración.
- Storybook: cada componente incluye `Default`/variantes/estados/`CustomClasses`/`Unstyled` + las historias que su spec liste; a11y configurado para fallar en CI.
- Nunca publicar `src/`/secretos; `files:["dist"]`. Acciones de CI ya existen (no se tocan salvo que una task lo pida).

## Especificaciones fuente (contrato autoritativo — el implementer DEBE leer la del componente que le toca)

- Button: `C:\Users\DELL\Desktop\code\herramientas\teams4soft-ui\components_docs\migration\01_button.md`
- Tooltip: `C:\Users\DELL\Desktop\code\herramientas\teams4soft-ui\components_docs\migration\02_tooltip.md`
- FormField: `C:\Users\DELL\Desktop\code\herramientas\teams4soft-ui\components_docs\migration\03_form_field.md`
- TextField: `C:\Users\DELL\Desktop\code\herramientas\teams4soft-ui\components_docs\migration\04_text_field.md`
- Plan maestro (reglas transversales): `C:\Users\DELL\Desktop\code\herramientas\teams4soft-ui\components_docs\migration\00_plan_maestro_ui_library.md`

---

## Estructura de archivos (Fase 1)

```text
src/
├── index.ts                      # reexporta lib + primitives + forms
├── lib/                          # (Fase 0) cn, composeEventHandlers, mergeRefs
├── primitives/
│   ├── index.ts                  # barrel: Button, Tooltip, TooltipProvider
│   ├── button/
│   │   ├── Button.tsx
│   │   ├── Button.types.ts
│   │   ├── Button.variants.ts    # CVA
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx
│   └── tooltip/
│       ├── Tooltip.tsx
│       ├── Tooltip.types.ts
│       ├── Tooltip.test.tsx
│       └── Tooltip.stories.tsx
├── forms/
│   ├── index.ts                  # barrel: FormField, TextField
│   ├── form-field/
│   │   ├── FormField.tsx
│   │   ├── FormField.context.ts
│   │   ├── FormField.types.ts
│   │   ├── FormField.test.tsx
│   │   └── FormField.stories.tsx
│   └── text-field/
│       ├── TextField.tsx
│       ├── TextField.types.ts
│       ├── TextField.test.tsx
│       └── TextField.stories.tsx
└── styles/                       # (Fase 0)
```

---

### Task 1: Preparación de Fase 1 (deps, tsup Radix, Tailwind en Storybook, subpaths)

**Files:**
- Modify: `tsup.config.ts`, `package.json`, `.storybook/main.ts`, `.storybook/preview.ts`
- Create: `src/primitives/index.ts`, `src/forms/index.ts`

**Interfaces:**
- Consumes: Fase 0 build.
- Produces: `pnpm build` genera además `dist/primitives.*` y `dist/forms.*`; `exports` gana `./primitives` y `./forms`; Storybook renderiza utilidades Tailwind en vivo; deps de Radix disponibles.

- [ ] **Step 1: Instalar dependencias**

Radix como dev (para build/stories/tests) y declararlas como peer:
```bash
pnpm add -D @radix-ui/react-slot @radix-ui/react-tooltip @tailwindcss/vite @testing-library/user-event
```
Añadir a `peerDependencies` en `package.json` (junto a react/react-dom):
```json
"@radix-ui/react-slot": ">=1.1.0",
"@radix-ui/react-tooltip": ">=1.1.0"
```
Y a `peerDependenciesMeta` marcarlas `optional: false` no es necesario; documentarlas en README como peers requeridos por los componentes que las usan.

- [ ] **Step 2: Corregir `external` de tsup para Radix (deferido de Fase 0)**

En `tsup.config.ts`, reemplazar la entrada glob rota `"@radix-ui/*"` por una expresión regular que sí matchea subpaquetes, y declarar las entradas múltiples:
```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts", "src/forms/index.ts"],
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
```

- [ ] **Step 3: Añadir subpaths a `exports` en `package.json`**

Insertar antes de `./styles.css`:
```json
"./primitives": {
  "types": "./dist/primitives.d.ts",
  "import": "./dist/primitives.js",
  "require": "./dist/primitives.cjs"
},
"./forms": {
  "types": "./dist/forms.d.ts",
  "import": "./dist/forms.js",
  "require": "./dist/forms.cjs"
},
```

- [ ] **Step 4: Crear barrels de categoría (vacíos por ahora)**

`src/primitives/index.ts`:
```ts
export {};
```
`src/forms/index.ts`:
```ts
export {};
```
(Se poblarán en cada task de componente.)

- [ ] **Step 5: Storybook renderiza Tailwind en vivo**

En `.storybook/main.ts`, añadir el plugin de Tailwind v4 al Vite de Storybook (sin romper el resto de la config existente):
```ts
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/react-vite", options: {} },
  async viteFinal(cfg) {
    cfg.plugins = cfg.plugins ?? [];
    cfg.plugins.push(tailwindcss());
    return cfg;
  },
};
export default config;
```
En `.storybook/preview.ts`, importar el input de tema (que ahora Vite compila con el plugin) en lugar de solo `tokens.css`:
```ts
import "../src/styles/theme.css";
```
(Sustituye la import previa de `tokens.css`; `theme.css` ya importa `tokens.css`.)

- [ ] **Step 6: Verificar build + Storybook**

Run:
```bash
pnpm build && ls dist
pnpm build-storybook
```
Expected: `dist/` contiene `index.*`, `primitives.*`, `forms.*` (`.js/.cjs/.d.ts`) y los CSS; `storybook-static/` se genera sin errores. Las utilidades Tailwind se resuelven en las historias.

- [ ] **Step 7: Confirmar que nada se rompió**

Run:
```bash
pnpm typecheck && pnpm test
```
Expected: typecheck limpio; 10/10 tests de Fase 0 siguen pasando.

- [ ] **Step 8: Commit**

```bash
git add tsup.config.ts package.json .storybook/main.ts .storybook/preview.ts src/primitives/index.ts src/forms/index.ts pnpm-lock.yaml
git commit -m "chore(fase1): setup radix externals, subpath exports, tailwind-in-storybook"
```

---

### Task 2: `Button` (primitives/button)

**Files:**
- Create: `src/primitives/button/Button.tsx`, `Button.types.ts`, `Button.variants.ts`, `Button.test.tsx`, `Button.stories.tsx`
- Modify: `src/primitives/index.ts` (exportar `Button`, `buttonVariants`, tipos)

**Interfaces:**
- Consumes: `cn`, `composeEventHandlers` (de `../../lib`), `@radix-ui/react-slot` (`Slot`), `class-variance-authority` (`cva`, `type VariantProps`).
- Produces: `Button` (forwardRef a `HTMLButtonElement`), `buttonVariants`, y los tipos `ButtonProps`/`ButtonVariant`/`ButtonSize`/`ButtonClassNames`. **Contrato exacto en `01_button.md`** — respétalo verbatim (variantes `primary|secondary|outline|ghost|danger|link`; tamaños `sm|md|lg|icon`; `loading`, `loadingLabel`, `leadingIcon`, `trailingIcon`, `fullWidth`, `asChild`, + contrato universal).

**Decisiones de implementación (no las re-deduzcas):**
- `type="button"` por defecto (evita submits accidentales) salvo que el consumidor pase otro `type`.
- `loading` y `disabled` deshabilitan la acción (`disabled` en el `<button>`); en `loading` añadir `aria-busy="true"`, mantener ancho, renderizar spinner en `classNames.spinner` y anunciar `loadingLabel` sin duplicar. Cuando `asChild` es true no se puede usar `disabled` nativo → aplicar `aria-disabled` + `data-disabled` y bloquear el click compuesto.
- `size="icon"` requiere nombre accesible: si no hay `aria-label`/`aria-labelledby` ni texto, emitir `console.warn` SOLO en desarrollo (`process.env.NODE_ENV !== "production"`).
- Estados `data-variant`, `data-size`, `data-loading`, `data-disabled`.
- Slots (`ButtonClassNames`): `root`, `content`, `leadingIcon`, `trailingIcon`, `spinner`. Combinar con `cn`. `unstyled` → no aplicar clases de `buttonVariants`, conservar estructura/semántica/protección de doble acción.
- Componer `onClick` del consumidor con la guarda interna vía `composeEventHandlers` y bloquear cuando `disabled||loading`.

- [ ] **Step 1: Leer el spec** `01_button.md` y el contrato universal del plan maestro §4.

- [ ] **Step 2: Escribir `Button.variants.ts` (CVA)** con tokens `--ui-*` (colores por token, foco visible con `--ui-focus`, sin colores de producto). Base neutra: `inline-flex items-center justify-center gap-2 rounded-[--radius-ui-md] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50` + variantes que consumen `bg-ui-primary`, `text-ui-primary-foreground`, `border-ui-border`, `text-ui-danger`, etc. Tamaños incl. `icon` (cuadrado). Exportar `buttonVariants` y `type ButtonVariantProps`.

- [ ] **Step 3: Escribir los tests que fallan (`Button.test.tsx`)** — casos mínimos (usar Testing Library + user-event):
  - renderiza children y `type="button"` por defecto;
  - un solo `onClick` en click normal;
  - NO dispara `onClick` cuando `disabled`;
  - NO dispara `onClick` cuando `loading`, y expone `aria-busy`;
  - `size="icon"` sin nombre accesible → advierte en dev (spyear `console.warn`);
  - reenvía `ref` al `<button>`;
  - clase externa `className="rounded-none"` prevalece (aparece en el DOM);
  - `asChild` renderiza el hijo (`<a>`) sin anidar `<button>`;
  - `unstyled` no incluye las clases base de variante pero sigue clickable.

- [ ] **Step 4: Verificar que fallan** — `pnpm exec vitest run src/primitives/button` → FAIL (módulo inexistente).

- [ ] **Step 5: Implementar `Button.types.ts` y `Button.tsx`** conforme al spec y a las decisiones de arriba.

- [ ] **Step 6: Verificar que pasan** — `pnpm exec vitest run src/primitives/button` → PASS. Output pristino.

- [ ] **Step 7: Escribir `Button.stories.tsx`** con las historias que el spec lista: `Variants`, `Sizes`, `Icons`, `IconOnly`, `Loading`, `Disabled`, `AsChild`, `FullWidth`, `CustomClasses`, `Unstyled`, `Keyboard`. `meta` con `tags: ["autodocs"]`.

- [ ] **Step 8: Exportar en el barrel** `src/primitives/index.ts`:
```ts
export { Button, buttonVariants } from "./button/Button";
export type { ButtonProps, ButtonVariant, ButtonSize, ButtonClassNames } from "./button/Button.types";
```

- [ ] **Step 9: Verificar suite + typecheck + build-storybook**
```bash
pnpm typecheck && pnpm test && pnpm build-storybook
```
Expected: todo verde; la historia `CustomClasses` muestra las utilidades Tailwind aplicadas.

- [ ] **Step 10: Commit**
```bash
git add src/primitives/button src/primitives/index.ts
git commit -m "feat(button): add Button primitive with variants, loading, asChild"
```

---

### Task 3: `Tooltip` (primitives/tooltip)

**Files:**
- Create: `src/primitives/tooltip/Tooltip.tsx`, `Tooltip.types.ts`, `Tooltip.test.tsx`, `Tooltip.stories.tsx`
- Modify: `src/primitives/index.ts` (exportar `Tooltip`, `TooltipProvider`, tipos)

**Interfaces:**
- Consumes: `@radix-ui/react-tooltip` (`* as TooltipPrimitive`), `cn`.
- Produces: `TooltipProvider` (re-export del de Radix con `delayDuration` por defecto) y `Tooltip` (wrapper de conveniencia). **Contrato exacto en `02_tooltip.md`**: `children: ReactElement`, `content: ReactNode`, `side`, `align`, `sideOffset`, `delayDuration`, `disabled`, `open`/`defaultOpen`/`onOpenChange`, + contrato universal con slots `content` y `arrow`.

**Decisiones de implementación:**
- `Tooltip` compone `TooltipPrimitive.Root` + `Trigger asChild` (envuelve `children`) + `Portal` + `Content` (+ `Arrow`). Reenvía `open`/`defaultOpen`/`onOpenChange` a `Root`; `side`/`align`/`sideOffset` a `Content`.
- `disabled` → no renderizar el tooltip (renderizar solo `children`), preservando el trigger.
- Slots (`TooltipClassNames`): `content`, `arrow`. Estados Radix `data-state`/`data-side`/`data-align` disponibles para Tailwind. `unstyled` quita clases visuales pero mantiene portal/colisión/foco.
- Content usa tokens (`bg-ui-foreground text-ui-background` o similar por token) + animación que respeta `motion-reduce`.
- NO poner el tooltip como único nombre accesible (documentarlo; el trigger conserva su `aria-label`).

- [ ] **Step 1: Leer** `02_tooltip.md`.
- [ ] **Step 2: Tests que fallan (`Tooltip.test.tsx`)** — con user-event dentro de un `TooltipProvider`:
  - al enfocar el trigger aparece el `content` (rol `tooltip`) tras el delay (usar `delayDuration={0}` en el test);
  - `Escape` lo cierra;
  - `disabled` no monta el tooltip pero el trigger sigue presente y con su `aria-label`;
  - `open` controlado respeta el valor y llama `onOpenChange`;
  - `classNames.content="rounded-none"` aparece en el contenido.
- [ ] **Step 3: Verificar fallo** — `pnpm exec vitest run src/primitives/tooltip` → FAIL.
- [ ] **Step 4: Implementar** `Tooltip.types.ts` y `Tooltip.tsx`.
- [ ] **Step 5: Verificar pase** — PASS, output pristino.
- [ ] **Step 6: Stories (`Tooltip.stories.tsx`)** — `Sides`, `Controlled`, `LongContent`, `CustomClasses`, `Unstyled`, `Keyboard`, `Collision`. Envolver en `TooltipProvider` (decorator). `tags: ["autodocs"]`.
- [ ] **Step 7: Exportar en barrel** `src/primitives/index.ts`:
```ts
export { Tooltip, TooltipProvider } from "./tooltip/Tooltip";
export type { TooltipProps, TooltipClassNames } from "./tooltip/Tooltip.types";
```
- [ ] **Step 8: Verificar** `pnpm typecheck && pnpm test && pnpm build-storybook`.
- [ ] **Step 9: Commit** `feat(tooltip): add Tooltip primitive over radix with slots and controlled state`.

---

### Task 4: `FormField` (forms/form-field)

**Files:**
- Create: `src/forms/form-field/FormField.tsx`, `FormField.context.ts`, `FormField.types.ts`, `FormField.test.tsx`, `FormField.stories.tsx`
- Modify: `src/forms/index.ts` (exportar `FormField`, tipos, y el hook de contexto)

**Interfaces:**
- Consumes: `cn`, `mergeRefs`, React `useId`, `createContext`/`useContext`, `cloneElement`.
- Produces: `FormField` (componente con props de conveniencia `label`/`description`/`errorMessage`/`required`/`optional`/`invalid`/`disabled`/`reserveMessageSpace`/`children` + contrato universal) **y** la API compuesta `FormField.Root/Label/Control/Description/Error`. Exporta `useFormFieldContext()` para que `TextField` (Task 5) consuma ids/aria. **Contrato exacto en `03_form_field.md`.**

**Decisiones de implementación:**
- Contexto `FormFieldContext` con: `id`, `descriptionId`, `errorId`, `invalid`, `required`, `optional`, `disabled`. IDs estables con `useId` (permitir override por prop `id`).
- El `children` (control) recibe por composición: `id`, `aria-invalid` (si `invalid`), `aria-required` (si `required`), `aria-describedby` = ids presentes (description y/o error), `disabled`. Componer sin sobrescribir valores ya provistos por el hijo. Usar `cloneElement` + `mergeRefs` si el hijo trae ref.
- El error reemplaza visualmente a la descripción, pero `aria-describedby` NO debe apuntar a un nodo ausente (incluir errorId solo si hay error; descriptionId solo si hay descripción).
- `reserveMessageSpace` reserva altura del área de mensaje (sin imponer alturas globales).
- Estados `data-invalid`/`data-disabled`/`data-required`/`data-optional`. Indicador requerido con texto para lector (no solo color/asterisco).
- Slots `FormFieldClassNames`: `root`, `label`, `requiredIndicator`, `optionalIndicator`, `control`, `description`, `error`.

- [ ] **Step 1: Leer** `03_form_field.md`.
- [ ] **Step 2: Tests que fallan (`FormField.test.tsx`)**:
  - `label` se asocia al control por `htmlFor`/`id` (clic en label enfoca el input hijo);
  - con `errorMessage`, el control tiene `aria-invalid="true"` y `aria-describedby` incluye el id del error;
  - con `description` (sin error), `aria-describedby` incluye el id de la descripción y NO un id de error inexistente;
  - `required` → `aria-required="true"` en el control + indicador con texto accesible;
  - `disabled` → propaga `disabled` al control y `data-disabled` en root;
  - la API compuesta (`FormField.Root`+`Label`+`Control`+`Error`) produce las mismas asociaciones;
  - `classNames.error="text-red-700"` aparece en el nodo de error.
- [ ] **Step 3: Verificar fallo** — `pnpm exec vitest run src/forms/form-field` → FAIL.
- [ ] **Step 4: Implementar** `FormField.context.ts`, `FormField.types.ts`, `FormField.tsx` (ambas APIs: props de conveniencia y subcomponentes).
- [ ] **Step 5: Verificar pase** — PASS, output pristino.
- [ ] **Step 6: Stories** — `Default`, `Required`, `Optional`, `Description`, `Error`, `Disabled`, `HorizontalCustom`, `ReservedSpace`, `Unstyled` (usar un `<input>` simple como control en las historias que no dependan de TextField). `tags: ["autodocs"]`.
- [ ] **Step 7: Exportar en barrel** `src/forms/index.ts`:
```ts
export { FormField, useFormFieldContext } from "./form-field/FormField";
export type { FormFieldProps, FormFieldClassNames } from "./form-field/FormField.types";
```
- [ ] **Step 8: Verificar** `pnpm typecheck && pnpm test && pnpm build-storybook`.
- [ ] **Step 9: Commit** `feat(form-field): add FormField with compound API and aria wiring`.

---

### Task 5: `TextField` (forms/text-field)

**Files:**
- Create: `src/forms/text-field/TextField.tsx`, `TextField.types.ts`, `TextField.test.tsx`, `TextField.stories.tsx`
- Modify: `src/forms/index.ts` (exportar `TextField`, tipos)

**Interfaces:**
- Consumes: `cn`, `composeEventHandlers`, `mergeRefs`, `useFormFieldContext` (Task 4), `Button` (Task 2) para los botones auxiliares (o `<button type="button">` nativo con nombre accesible). React `useState`/`useId`/`forwardRef`.
- Produces: `TextField` (forwardRef a `HTMLInputElement`). **Contrato exacto en `04_text_field.md`**: extiende `InputHTMLAttributes` omitiendo `value|defaultValue|onChange|size`; añade `value`/`defaultValue`/`onValueChange`/`size`/`leading`/`trailing`/`clearable`/`onClear`/`revealPassword`/`invalid`/`loading` + contrato universal.

**Decisiones de implementación:**
- Controlado (`value`) y no controlado (`defaultValue` + estado interno). `onValueChange(nextValue)` en cada cambio; NO exponer `onChange` DOM en el contrato base (documentar alternativa si hiciera falta).
- Consumir `useFormFieldContext()` si existe: aplicar `id`, `aria-invalid`, `aria-required`, `aria-describedby`, `disabled` desde el contexto sin sobrescribir props explícitas. `invalid` prop se combina (OR) con el del contexto.
- `clearable`: mostrar botón de limpiar solo cuando hay contenido; al limpiar, vaciar valor, llamar `onClear` y devolver foco al input.
- `revealPassword` (aplica cuando `type="password"`): toggle que alterna a `text`/`password` conservando foco y posición del cursor (`selectionStart/End`). Botón con nombre accesible ("Mostrar/Ocultar contraseña").
- `loading`: spinner en el slot trailing sin bloquear escritura.
- Estados `data-size`/`data-invalid`/`data-disabled`/`data-readonly`/`data-loading`/`data-has-leading`/`data-has-trailing`. Slots `TextFieldClassNames`: `root`, `input`, `leading`, `trailing`, `clearButton`, `passwordToggle`. `unstyled` conserva botones accesibles y funcionales.

- [ ] **Step 1: Leer** `04_text_field.md`.
- [ ] **Step 2: Tests que fallan (`TextField.test.tsx`)** — con user-event:
  - controlado: teclear dispara `onValueChange` con el valor acumulado; el input refleja `value`;
  - no controlado (`defaultValue`): teclear actualiza el input sin `value` externo;
  - `clearable`: el botón aparece con contenido, limpia y devuelve foco;
  - password: el toggle alterna visibilidad conservando la posición del cursor;
  - reenvía `ref` al `<input>`;
  - dentro de un `FormField label="Usuario" required`, el input recibe `aria-required` y el `id` asociado al label;
  - `classNames.input="font-mono"` aparece en el input;
  - `readOnly` y `disabled` producen `data-readonly`/`data-disabled` distintos.
- [ ] **Step 3: Verificar fallo** — `pnpm exec vitest run src/forms/text-field` → FAIL.
- [ ] **Step 4: Implementar** `TextField.types.ts` y `TextField.tsx`.
- [ ] **Step 5: Verificar pase** — PASS, output pristino.
- [ ] **Step 6: Stories** — `Default`, `Sizes`, `LeadingAndTrailing`, `Clearable`, `Password`, `Loading`, `ReadOnly`, `Disabled`, `Invalid`, `Controlled`, `Uncontrolled`, `CustomClasses`, `Unstyled`, y una historia `WithFormField`. `tags: ["autodocs"]`.
- [ ] **Step 7: Exportar en barrel** `src/forms/index.ts`:
```ts
export { TextField } from "./text-field/TextField";
export type { TextFieldProps, TextFieldClassNames } from "./text-field/TextField.types";
```
- [ ] **Step 8: Verificar** `pnpm typecheck && pnpm test && pnpm build-storybook`.
- [ ] **Step 9: Commit** `feat(text-field): add TextField with clear/password/loading and FormField integration`.

---

### Task 6: Integración, índice raíz y verificación end-to-end

**Files:**
- Modify: `src/index.ts` (reexportar primitives + forms), `README.md` (peers requeridos + lista de componentes)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `src/index.ts` reexporta `./lib`, `./primitives`, `./forms`; build y publish dry-run limpios; README documenta peers de Radix.

- [ ] **Step 1: Índice raíz `src/index.ts`**
```ts
export { cn, composeEventHandlers, mergeRefs } from "./lib";
export * from "./primitives";
export * from "./forms";
```

- [ ] **Step 2: README — peers requeridos y componentes**

Añadir sección documentando que `Tooltip` requiere `@radix-ui/react-tooltip` y `Button asChild`/otros usan `@radix-ui/react-slot` como peers, con el comando de instalación; y listar los componentes disponibles (Button, Tooltip, FormField, TextField).

- [ ] **Step 3: Verificación end-to-end (instalación limpia)**
```bash
rm -rf node_modules dist storybook-static
pnpm install --frozen-lockfile
pnpm typecheck && pnpm test && pnpm build && pnpm publish --dry-run --no-git-checks
pnpm build-storybook
```
Expected: todo verde; el tarball incluye `dist/{index,primitives,forms}.{js,cjs,d.ts}` + CSS + manifest/README/LICENSE, sin `src/` ni fugas.

- [ ] **Step 4: Confirmar exports resolubles**
```bash
node -e "import('./dist/primitives.js').then(m=>console.log('primitives:', Object.keys(m)))"
node -e "import('./dist/forms.js').then(m=>console.log('forms:', Object.keys(m)))"
```
Expected: `primitives: [ 'Button', 'buttonVariants', 'Tooltip', 'TooltipProvider' ]`; `forms: [ 'FormField', 'useFormFieldContext', 'TextField' ]`.

- [ ] **Step 5: Commit**
```bash
git add src/index.ts README.md
git commit -m "feat(fase1): export primitives and forms from root, document radix peers"
```

---

## Self-Review (cobertura)

- **Contrato universal en los 4** → Tasks 2–5 (cada uno incluye `className`/`classNames`/`unstyled`/`style`/`styles`, `data-*`, ref, tokens). ✅
- **Button** (01) variantes/tamaños/loading/asChild/iconos → Task 2. ✅
- **Tooltip** (02) Radix/side/align/controlado/slots → Task 3. ✅
- **FormField** (03) ambas APIs + wiring ARIA + useId → Task 4. ✅
- **TextField** (04) controlado/no controlado/clear/password/loading + integración FormField → Task 5. ✅
- **Radix external fix** (deferido de Fase 0) → Task 1 Step 2. ✅
- **Storybook Tailwind en vivo** (Minor #2 de Fase 0) → Task 1 Step 5. ✅
- **Subpaths ./primitives ./forms** (spec §3.3) → Task 1 + Task 6. ✅
- **Historias requeridas por spec + a11y** → cada task de componente. ✅

**Placeholder scan:** el contrato completo de cada componente vive en su spec (`01`–`04`, rutas absolutas dadas); no hay TBD. Casos de prueba y decisiones no obvias están enumerados por task.

**Consistencia de tipos:** `useFormFieldContext` se define en Task 4 y se consume en Task 5; barrels `primitives`/`forms` se crean vacíos en Task 1 y se pueblan incrementalmente; `src/index.ts` los reexporta en Task 6.

**Fuera de alcance (Fase 2+):** CheckboxField, RadioGroup, Fieldset, FormGrid, DateField, SearchableSelectField y demás; Playwright/regresión visual.
