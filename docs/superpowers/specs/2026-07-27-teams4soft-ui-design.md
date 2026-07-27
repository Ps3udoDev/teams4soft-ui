# Diseño: Librería UI `@teams4soft/teams4soft-ui`

> Fecha: 2026-07-27
> Estado: aprobado — pendiente de revisión final del usuario antes de escribir el plan de implementación.
> Documento rector de referencia: `../../../../components_docs/migration/00_plan_maestro_ui_library.md` (queda fuera del repo del proyecto, es documentación de origen).

## 1. Objetivo

Construir una librería de componentes React + TypeScript, **visualmente neutra y tematizable**, publicada en npm público como `@teams4soft/teams4soft-ui`, documentada con Storybook, con seguridad de cadena de suministro (supply chain) integrada en CI/CD. La librería extrae los patrones valiosos de un proyecto existente sin arrastrar dependencias de negocio, rutas, stores ni servicios privados.

El diseño de componentes, contratos, tokens, orden de extracción y "definición de terminado" **ya están especificados** en el plan maestro y los docs por componente (`components_docs/`). Este spec **no los redefine**; fija las decisiones de **infraestructura, build, publicación, CI/CD de seguridad y el plan de fases de implementación** que faltaban por cerrar.

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Gestor de paquetes | **pnpm**, con `pnpm-lock.yaml` commiteado e instalación `--frozen-lockfile` en CI |
| Nombre del paquete | `@teams4soft/teams4soft-ui` |
| Distribución | **npm público**, con 2FA + `--provenance`; Storybook estático desplegado a Vercel como demo |
| React (peer) | `>=18.0.0` (soporta React 18 y 19) |
| Testing en Fase 0 | **Lean**: Vitest + Testing Library + Storybook a11y (axe). Playwright y regresión visual se difieren a una fase posterior |
| Ubicación del proyecto | Subcarpeta `teams4soft-ui/` (este repo git, remote `origin` = `https://github.com/Ps3udoDev/teams4soft-ui.git`). La documentación de origen queda en el directorio padre, fuera del repo |

## 3. Toolchain y arquitectura de build

### 3.1. Build de JS/TS — `tsup`

- Salidas: **ESM** (`.js`) + **CJS** (`.cjs`) + tipos (`.d.ts`).
- `external`: `react`, `react-dom`, `react/jsx-runtime` y **todas las peer deps de comportamiento** (Radix, `@tanstack/react-table`, Floating UI). No se bundlean.
- `treeshake: true`, `sourcemap: true`, `clean: true`, `splitting: false`.
- Múltiples entradas para habilitar subpaths (ver `exports`).

### 3.2. Build de CSS — Tailwind v4 (separado de tsup)

**Problema detectado:** la *Guía de Inicio* usa tsup pero tsup no procesa CSS, y el plan maestro exige Tailwind v4 con tokens/tema. Decisión:

- El CSS se compila **aparte** con el CLI de Tailwind v4 escaneando `src/`, produciendo:
  - `dist/styles.css` — tokens + tema base + utilidades usadas por los componentes.
  - `dist/tokens.css` — solo los tokens semánticos (`@theme` + variables CSS), para quien solo quiera temar.
- El consumidor importa el CSS explícitamente: `import "@teams4soft/teams4soft-ui/styles.css"`.
- **Ventaja:** la librería se **desacopla** del `tailwind.config` del consumidor — no depende de que él añada nuestro `dist` a su `content`. Precompilamos las utilidades que usamos y las enviamos.
- `sideEffects: ["*.css"]` para que el tree-shaking no elimine los estilos.

### 3.3. `exports` map (tree-shaking por categoría)

```jsonc
{
  ".":            { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
  "./primitives": { "types": "./dist/primitives.d.ts", "import": "./dist/primitives.js", "require": "./dist/primitives.cjs" },
  "./forms":      { "...": "..." },
  "./overlays":   { "...": "..." },
  "./feedback":   { "...": "..." },
  "./data-display": { "...": "..." },
  "./layout":     { "...": "..." },
  "./styles.css": "./dist/styles.css",
  "./tokens.css": "./dist/tokens.css"
}
```

### 3.4. Storybook

- Builder **react-vite** (Vite es solo el motor de Storybook, no el build de la librería).
- Autodocs activado.
- `@storybook/addon-a11y` (axe) configurado para **fallar en CI** ante nuevas infracciones.

## 4. Estructura del paquete

Según el plan maestro (sección 6), dentro de `teams4soft-ui/`:

```text
src/
├── primitives/      (button, tooltip)
├── forms/           (form-field, text-field, checkbox-field, radio-group, date-field,
│                     searchable-select-field, file-picker-field, entity-lookup-field)
├── overlays/        (responsive-dialog, feedback-dialog)
├── feedback/        (toast, loading)
├── data-display/    (adaptive-data-table)
├── layout/          (page-shell, section-panel, fieldset, form-grid)
├── lib/             (cn, composición de eventos, utilidades de variantes)
├── styles/          (tokens.css, theme.css)
└── index.ts
```

Cada componente sigue la convención de la guía: `Componente.tsx`, `Componente.types.ts`, `Componente.stories.tsx`, tests, y opcional `Componente.styles.ts` (variantes CVA).

## 5. Contrato universal (recordatorio, ya definido)

Todo componente público acepta `className`, `classNames` (por slot), `unstyled`, `style`, `styles`; expone estados vía `data-*` + ARIA; reenvía `ref` y props DOM válidas (componiendo handlers, sin sobrescribir); usa tokens semánticos (nunca colores de producto); `asChild` donde la primitiva lo permita. Detalle completo en el plan maestro §4 y §9.

## 6. Testing (lean, ampliable)

- **Fase 0:** Vitest + Testing Library + `@storybook/addon-a11y`. Interaction tests básicos con Storybook `play`.
- **Diferido (fase posterior):** Playwright (teclado/overlays) y regresión visual. La config se deja preparada con "ganchos" para no reescribirla después.
- Un componente cumple la "definición de terminado" del plan maestro §13.

## 7. CI/CD y seguridad — GitHub Actions

Principios transversales: acciones **pinneadas por SHA** (no por tag flotante), `permissions` mínimos por workflow, `--frozen-lockfile` siempre.

### 7.1. `ci.yml` (push / PR)
`install --frozen-lockfile` → `typecheck` → `lint` → `test` → `build` → `pnpm pack --dry-run` (falla si el tarball incluye `src/`, `.env`, claves o cualquier cosa fuera de `dist`).

### 7.2. `security.yml` (la "acción de revisión de seguridad" solicitada)
- `pnpm audit --audit-level high` (falla en high/critical).
- `actions/dependency-review-action` en PRs (bloquea deps vulnerables o con licencia no permitida).
- **CodeQL** (JavaScript/TypeScript) — análisis estático.
- Opcional: OpenSSF **Scorecard**.

### 7.3. `release.yml` (en tag / release)
`build` → `pnpm publish --access public --provenance` (2FA / token de automatización con provenance) → deploy de Storybook estático a Vercel.

## 8. Seguridad del paquete (checklist del proyecto)

- `"files": ["dist"]` como allowlist estricta — nunca publicar `src/` ni config de Storybook.
- Peer deps de comportamiento (Radix, TanStack) como `peerDependencies`, no `dependencies` (evita duplicados y conflictos de versión).
- Versiones fijadas + lockfile exigido en CI (mitigación supply chain, según `dependencias_terceros.md`).
- `pnpm pack --dry-run` verificado en CI antes de cualquier publish.
- 2FA obligatorio en la cuenta npm; publish con provenance.

## 9. Plan de implementación por fases

Mapea el orden del plan maestro §7. Cada fase es incremental y deja el repo en verde (compila + tests + Storybook).

- **Fase 0 — Preparación (primer entregable).** Scaffolding pnpm; `tsconfig` estricto; `tsup`; pipeline CSS Tailwind v4 (`tokens.css`/`theme.css` → `dist/styles.css` + `dist/tokens.css`); `lib/cn`, CVA y utilidad de composición de eventos; Storybook + addon a11y; Vitest + Testing Library; los tres workflows de GitHub Actions; verificación `pack --dry-run`. **Salida:** repo compilando, testeable y publicable en vacío.
- **Fase 1 — Primitivas P0.** Button → Tooltip → FormField → TextField.
- **Fase 2 — Controles de formulario.** CheckboxField, RadioGroup, Fieldset, FormGrid, DateField, SearchableSelectField.
- **Fase 3 — Feedback y overlays.** ToastProvider, LoadingFeedback, ResponsiveDialog, FeedbackDialog.
- **Fase 4 — Componentes complejos.** FilePickerField, AdaptiveDataTable, EntityLookupField.
- **Fase 5 — Layout.** SectionPanel, PageShell.
- **Fase 6 — Deploy y adopción.** Guía de deploy (release npm + Storybook), publicación estable `1.0.0`, adaptadores de compatibilidad y migración incremental.

Ciclo por componente (todas las fases 1–5): contrato TS → implementación → stories requeridas → tests unit + a11y → doc de migración → verde en CI.

## 10. Fuera de alcance (YAGNI)

- Playwright y regresión visual en Fase 0 (diferidos).
- Selección remota masiva de `AdaptiveDataTable` en su primera versión (el plan maestro la marca como opcional; no simular seleccionando solo la página).
- Adaptadores de librerías de formularios en el núcleo — van en subpaths opcionales, nunca en `index`.
- Reescritura completa de la app consumidora — la migración es incremental por feature.

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| CSS de Tailwind v4 no llega al consumidor | Precompilar y enviar `dist/styles.css`; documentar el import obligatorio |
| Duplicación de Radix/TanStack en el bundle del consumidor | peerDependencies + `external` en tsup |
| Publicar código fuente o secretos por error | `files: [dist]` + `pack --dry-run` en CI que falla el pipeline |
| Vulnerabilidad en dependencia de terceros | `pnpm audit` + dependency-review + CodeQL en CI; versiones fijadas |
| Nombre `@teams4soft/teams4soft-ui` ocupado en npm | Verificar disponibilidad del scope antes de Fase 6; scope de org permite reservarlo |
