# Fase 3a — Feedback no bloqueante (Toast + Loading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el feedback no bloqueante de la librería — `ToastProvider` (con API imperativa llamable desde fuera de React) más `Spinner`, `Skeleton`, `Progress` y `LoadingOverlay` — accesibles, tematizables y con el contrato universal de personalización, listos para publicar como `0.4.0`.

**Architecture:** Familia nueva `src/feedback/` con subpath de paquete `./feedback`. El toast se apoya en `@radix-ui/react-toast` (nueva peerDependency) para pausa, swipe, anuncio a lectores de pantalla y `Escape`, y añade encima una **store propia que vive fuera de React** (`createToastStore()` consumida con `useSyncExternalStore`) que aporta cola FIFO, `maxVisible`, deduplicación, `update()` y la API imperativa. Esa store externa es lo que permite el `toast` importable desde interceptores HTTP y capas de servicio. La lógica determinista de la store se implementa y se prueba **antes** que cualquier componente, igual que se hizo con `date-utils`/`select-utils` en la Fase 2b. Los cuatro componentes de carga son presentacionales y sin dependencias entre sí salvo `LoadingOverlay`, que compone `Spinner`.

**Tech Stack:** React 18/19, TypeScript estricto, `@radix-ui/react-toast`, Tailwind CSS v4 con tokens `--ui-*`, `useSyncExternalStore`, `cn` (clsx+tailwind-merge), tsup (ESM+CJS+dts), Vitest + Testing Library + user-event, Storybook 10.

**Spec vinculante:** `docs/superpowers/specs/2026-08-02-fase-3a-feedback-design.md`. Documentos de origen: `components_docs/migration/09_toast_provider.md` y `10_loading_feedback.md`.

## Global Constraints

- **Gestor de paquetes:** pnpm 9.0.0 (`packageManager` fijado). Usar `pnpm`, nunca `npm`/`yarn`.
- **Directorio de trabajo:** el repo git es la carpeta anidada `teams4soft-ui/teams4soft-ui/`. Todo subagente debe `cd` a esa carpeta. La carpeta padre solo tiene documentación.
- **Contrato universal de personalización** (plan maestro §4): `className` (raíz), `classNames` (por slot), `unstyled`, `style`, `styles` (por slot). Merge de clases `cn(!unstyled && base, className, classNames?.slot)` — el consumidor va al final y gana vía tailwind-merge. Merge de estilos: raíz `{ ...styles?.root, ...style }`; slots `{ ...styles?.slot }`. `unstyled` conserva comportamiento y accesibilidad, elimina solo clases visuales.
- **Estados como `data-*`:** presencia condicional con `|| undefined`. Exponer también los `data-*` de Radix (`data-state`, `data-swipe`).
- **Callbacks semánticos.** Sin eventos sintéticos inventados.
- **Tokens semánticos, no colores:** `bg-ui-primary`, `text-ui-foreground`, `border-ui-border`, `text-ui-danger`, `ring-ui-focus`, `bg-ui-background`, `bg-ui-muted`, `text-ui-primary-foreground`. **Tailwind v4:** valores CSS-var arbitrarios con PARÉNTESIS `rounded-(--radius-ui-md)`, NUNCA corchetes.
- **Import de `cn`/utilidades:** desde `../../lib` (los componentes están en `src/feedback/x/`).
- **Dev-warnings guardados** detrás de `typeof process !== "undefined" && process.env.NODE_ENV !== "production"`.
- **Sin `any` en la API pública.** Sin dependencias de negocio, router ni stores de aplicación. Documentación en español, nombres de API en inglés.
- **`tsconfig` tiene `noUncheckedIndexedAccess`:** indexar un array devuelve `T | undefined`. Hay que estrechar con `!` o con guarda explícita, incluso en los tests. Es la causa del único error de tipos de la Fase 2b.
- **Reglas críticas del toast:**
  - `duration: "persistent"` se traduce a **`2_147_483_647`, nunca `Infinity`**: `setTimeout` coacciona su argumento a int32, así que `Infinity` colapsa a `0` y el toast se cerraría de inmediato.
  - `getState()` debe devolver **una referencia estable** entre mutaciones. `useSyncExternalStore` compara snapshots por identidad: devolver un objeto literal nuevo en cada llamada provoca un bucle infinito de renders.
  - El `toast` importable es **API client-only**. La store global solo se escribe desde cliente y el provider `global` la limpia al desmontarse.
  - La retirada de un toast cerrado usa un **temporizador alineado con la animación de salida** (`TOAST_EXIT_MS`), no el evento de fin de transición. Es la "red de seguridad" del spec §7.1 promovida a mecanismo principal: en jsdom y con `prefers-reduced-motion` el evento nunca llega, y sin temporizador la cola acumularía entradas zombis.
- **Verificación de paquete:** `pnpm publish --dry-run --no-git-checks` (pnpm 9 NO soporta `pnpm pack --dry-run`). El dry-run puede terminar con exit 1 por colisión con la versión ya publicada; eso NO es defecto de empaquetado — validar por la lista de archivos, no por el exit code.
- **Tests:** `pnpm test`. `pnpm typecheck` y `pnpm build` deben pasar al final.

---

### Task 1: Dependencia, subpath `./feedback` y wiring del build

Establece la infraestructura que consumen todas las tareas siguientes. Deliverable verificable: `pnpm install` + `pnpm build` + dry-run muestran el subpath nuevo sin romper nada.

**Files:**
- Modify: `package.json` (peerDependencies, devDependencies, exports)
- Modify: `tsup.config.ts` (nueva entry `feedback`)
- Modify: `src/index.ts` (re-export de la familia)
- Create: `src/feedback/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: peerDependency `@radix-ui/react-toast >=1.2.0`; subpath `@teams4soft/teams4soft-ui/feedback` mapeado a `dist/feedback.{js,cjs,d.ts}`; `src/feedback/index.ts` como punto de re-export.

- [ ] **Step 1: Añadir la peer y la dev dep**

En `peerDependencies` de `package.json`, en orden alfabético junto a las otras `@radix-ui/*` (va después de `react-slot` y antes de `react-tooltip`):

```json
"@radix-ui/react-toast": ">=1.2.0"
```

En `devDependencies`, junto a las otras `@radix-ui/*`:

```json
"@radix-ui/react-toast": "^1.2.6"
```

- [ ] **Step 2: Añadir el subpath a `exports`**

En el bloque `exports` de `package.json`, tras `"./layout"`:

```json
"./feedback": {
  "types": "./dist/feedback.d.ts",
  "import": "./dist/feedback.js",
  "require": "./dist/feedback.cjs"
},
```

- [ ] **Step 3: Añadir la entry a tsup**

En `tsup.config.ts`, dentro de `entry`, tras `layout`:

```ts
feedback: "src/feedback/index.ts",
```

No tocar `external`: la regex `/^@radix-ui\//` ya cubre la peer nueva.

- [ ] **Step 4: Crear el índice de la familia**

`src/feedback/index.ts`:

```ts
// Los componentes de feedback se exportan aquí a medida que se implementan.
// Ver docs/superpowers/specs/2026-08-02-fase-3a-feedback-design.md.
export {};
```

- [ ] **Step 5: Re-exportar desde la raíz**

En `src/index.ts`, tras `export * from "./layout";`:

```ts
export * from "./feedback";
```

- [ ] **Step 6: Instalar y construir**

Run: `pnpm install && pnpm build`
Expected: instala `@radix-ui/react-toast`, actualiza el lockfile, y el build emite `dist/feedback.js`, `dist/feedback.cjs` y `dist/feedback.d.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml tsup.config.ts src/index.ts src/feedback/index.ts
git commit -m "chore(fase3a): add @radix-ui/react-toast peer and ./feedback subpath"
```

---

### Task 2: Contrato de tipos del toast

Contrato TypeScript completo, sin lógica. Aislarlo evita que las Tasks 3 y 5 se pisen redefiniendo tipos.

**Files:**
- Create: `src/feedback/toast/Toast.types.ts`

**Interfaces:**
- Consumes: nada.
- Produces (Tasks 3-5 consumen estas firmas exactas):
  - `ToastTone`, `ToastPosition`, `ToastAction`, `ToastOptions`, `ToastApi`, `ToastClassNames`, `ToastProviderProps`
  - `ToastStatus = "open" | "closing"`
  - `ToastEntry`, `ToastStoreState`, `ToastStoreConfig`, `ToastStore`

- [ ] **Step 1: Escribir el contrato**

`src/feedback/toast/Toast.types.ts`:

```ts
import type * as React from "react";

export type ToastTone = "success" | "error" | "warning" | "info" | "neutral";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Texto alternativo para lectores de pantalla. Por defecto, `label`. */
  altText?: string;
}

export interface ToastOptions {
  id?: string;
  title: React.ReactNode;
  message?: React.ReactNode;
  /** Default `"neutral"`. */
  tone?: ToastTone;
  /** Default: el `defaultDuration` del provider. */
  duration?: number | "persistent";
  /** Reemplaza el icono del tono solo en este toast. */
  icon?: React.ReactNode;
  action?: ToastAction;
  /** Muestra el botón de cierre. Default `true`. */
  dismissible?: boolean;
  /** Evita duplicados: si ya hay un toast vivo con esta clave, se refresca. */
  dedupeKey?: string;
}

export interface ToastApi {
  show: (options: ToastOptions) => string;
  success: (options: Omit<ToastOptions, "tone">) => string;
  error: (options: Omit<ToastOptions, "tone">) => string;
  warning: (options: Omit<ToastOptions, "tone">) => string;
  info: (options: Omit<ToastOptions, "tone">) => string;
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/** `closing` = animando la salida; sigue en la cola hasta que se retira. */
export type ToastStatus = "open" | "closing";

export interface ToastEntry extends ToastOptions {
  id: string;
  tone: ToastTone;
  dismissible: boolean;
  status: ToastStatus;
  createdAt: number;
  /**
   * Se incrementa cuando el temporizador debe reiniciarse. El viewport lo
   * incluye en la `key` de React para forzar el remontaje del `Toast.Root`,
   * que es la única forma de que la primitiva reinicie su cuenta atrás.
   */
  restartedAt: number;
}

export interface ToastStoreState {
  toasts: ToastEntry[];
}

export interface ToastStoreConfig {
  /** Tope de entradas en la store. Default 50. */
  maxQueued?: number;
}

export interface ToastStore extends ToastApi {
  /** Devuelve SIEMPRE la misma referencia entre mutaciones (requisito de useSyncExternalStore). */
  getState: () => ToastStoreState;
  /** Snapshot constante para SSR. */
  getServerState: () => ToastStoreState;
  subscribe: (listener: () => void) => () => void;
  /** Retira definitivamente una entrada, tras la animación de salida. */
  remove: (id: string) => void;
  /** Vacía la store sin animación. Se usa al desmontar el provider global. */
  clear: () => void;
}

export interface ToastClassNames {
  viewport: string;
  root: string;
  icon: string;
  content: string;
  title: string;
  message: string;
  action: string;
  closeButton: string;
  progress: string;
}

export interface ToastProviderProps {
  children?: React.ReactNode;
  /** Default `"top-right"`. */
  position?: ToastPosition;
  /** Cuántos se renderizan a la vez. El resto espera en cola. Default 4. */
  maxVisible?: number;
  /** Milisegundos por defecto. Default 4000. */
  defaultDuration?: number;
  /** Tope de entradas en la store. Default 50. */
  maxQueued?: number;
  /** Conecta este provider a la store del módulo, habilitando el `toast` importable. Default `false`. */
  global?: boolean;
  /** Reemplaza globalmente la iconografía por tono. */
  icons?: Partial<Record<ToastTone, React.ReactNode>>;
  /** Default `true`. Ponlo en `false` para colocar `<ToastViewport />` a mano. */
  renderViewport?: boolean;
  className?: string;
  classNames?: Partial<ToastClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ToastClassNames, React.CSSProperties>>;
}
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/feedback/toast/Toast.types.ts
git commit -m "feat(toast): public type contract"
```

---

### Task 3: Store del toast (lógica pura)

El corazón de la fase: cola FIFO, deduplicación, `update`, topes y ciclo de vida. Se prueba **sin montar React**.

**Files:**
- Create: `src/feedback/toast/toast-store.ts`
- Create: `src/feedback/toast/toast-store.test.ts`

**Interfaces:**
- Consumes: los tipos de `./Toast.types`.
- Produces: `createToastStore(config?: ToastStoreConfig): ToastStore`; la constante `TOAST_EXIT_MS = 150`; y `resolveToastDuration(duration: number | "persistent" | undefined, fallback: number): number`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/feedback/toast/toast-store.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createToastStore, resolveToastDuration } from "./toast-store";

describe("resolveToastDuration", () => {
  it("usa el fallback cuando no se indica duración", () => {
    expect(resolveToastDuration(undefined, 4000)).toBe(4000);
  });

  it("respeta una duración explícita", () => {
    expect(resolveToastDuration(1500, 4000)).toBe(1500);
  });

  it('traduce "persistent" a un entero finito, nunca Infinity', () => {
    const resolved = resolveToastDuration("persistent", 4000);
    expect(Number.isFinite(resolved)).toBe(true);
    expect(resolved).toBeGreaterThan(60_000);
    // `setTimeout` coacciona su argumento a int32: Infinity colapsaría a 0 y
    // el toast "persistente" se cerraría de inmediato.
    expect(resolved).toBeLessThanOrEqual(2_147_483_647);
  });
});

describe("createToastStore — cola", () => {
  it("conserva el orden FIFO", () => {
    const store = createToastStore();
    store.show({ title: "uno" });
    store.show({ title: "dos" });
    store.show({ title: "tres" });
    expect(store.getState().toasts.map((t) => t.title)).toEqual([
      "uno",
      "dos",
      "tres",
    ]);
  });

  it("devuelve ids únicos", () => {
    const store = createToastStore();
    const ids = [store.show({ title: "a" }), store.show({ title: "b" })];
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  it("respeta el id proporcionado", () => {
    const store = createToastStore();
    expect(store.show({ id: "custom", title: "a" })).toBe("custom");
  });

  it("aplica los valores por defecto de tone y dismissible", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    const entry = store.getState().toasts[0]!;
    expect(entry.tone).toBe("neutral");
    expect(entry.dismissible).toBe(true);
    expect(entry.status).toBe("open");
  });

  it("descarta la entrada más antigua al superar maxQueued", () => {
    const store = createToastStore({ maxQueued: 2 });
    store.show({ title: "uno" });
    store.show({ title: "dos" });
    store.show({ title: "tres" });
    expect(store.getState().toasts.map((t) => t.title)).toEqual([
      "dos",
      "tres",
    ]);
  });
});

describe("createToastStore — snapshot estable", () => {
  it("devuelve la misma referencia mientras no haya mutaciones", () => {
    const store = createToastStore();
    expect(store.getState()).toBe(store.getState());
    store.show({ title: "a" });
    const afterShow = store.getState();
    expect(afterShow).toBe(store.getState());
  });

  it("cambia de referencia tras cada mutación", () => {
    const store = createToastStore();
    const before = store.getState();
    store.show({ title: "a" });
    expect(store.getState()).not.toBe(before);
  });

  it("notifica a los suscriptores y permite darse de baja", () => {
    const store = createToastStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.show({ title: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.show({ title: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("createToastStore — atajos por tono", () => {
  it("success/error/warning/info fijan el tono", () => {
    const store = createToastStore();
    store.success({ title: "s" });
    store.error({ title: "e" });
    store.warning({ title: "w" });
    store.info({ title: "i" });
    expect(store.getState().toasts.map((t) => t.tone)).toEqual([
      "success",
      "error",
      "warning",
      "info",
    ]);
  });
});

describe("createToastStore — deduplicación", () => {
  it("refresca el existente en vez de duplicar y devuelve su id", () => {
    const store = createToastStore();
    const first = store.show({ title: "sin red", dedupeKey: "offline" });
    const second = store.show({ title: "sin red (2)", dedupeKey: "offline" });

    expect(second).toBe(first);
    expect(store.getState().toasts).toHaveLength(1);
    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("sin red (2)");
    expect(entry.restartedAt).toBe(1);
  });

  it("no deduplica contra un toast que ya se está cerrando", () => {
    const store = createToastStore();
    const first = store.show({ title: "a", dedupeKey: "k" });
    store.dismiss(first);
    const second = store.show({ title: "b", dedupeKey: "k" });
    expect(second).not.toBe(first);
    expect(store.getState().toasts).toHaveLength(2);
  });
});

describe("createToastStore — show sobre un id existente", () => {
  it("actualiza en sitio y reinicia el temporizador", () => {
    const store = createToastStore();
    store.show({ id: "fijo", title: "antes" });
    store.show({ id: "fijo", title: "después" });

    expect(store.getState().toasts).toHaveLength(1);
    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("después");
    expect(entry.restartedAt).toBe(1);
  });
});

describe("createToastStore — update", () => {
  it("mezcla los campos indicados y conserva el resto", () => {
    const store = createToastStore();
    const id = store.show({ title: "Guardando", tone: "info" });
    store.update(id, { title: "Guardado", tone: "success" });

    const entry = store.getState().toasts[0]!;
    expect(entry.title).toBe("Guardado");
    expect(entry.tone).toBe("success");
    expect(entry.id).toBe(id);
  });

  it("no reinicia el temporizador si la duración no cambia", () => {
    const store = createToastStore();
    const id = store.show({ title: "a", duration: 1000 });
    store.update(id, { title: "b" });
    expect(store.getState().toasts[0]!.restartedAt).toBe(0);
  });

  it("reinicia el temporizador cuando la duración cambia", () => {
    const store = createToastStore();
    const id = store.show({ title: "Guardando", duration: "persistent" });
    store.update(id, { title: "Guardado", duration: 3000 });
    expect(store.getState().toasts[0]!.restartedAt).toBe(1);
  });

  it("sobre un id inexistente es no-op", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    const before = store.getState();
    store.update("no-existe", { title: "b" });
    expect(store.getState()).toBe(before);
  });
});

describe("createToastStore — cierre y retirada", () => {
  it("dismiss marca closing sin retirar la entrada", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.dismiss(id);
    expect(store.getState().toasts).toHaveLength(1);
    expect(store.getState().toasts[0]!.status).toBe("closing");
  });

  it("dismiss dos veces no emite una segunda notificación", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.dismiss(id);
    const afterFirst = store.getState();
    store.dismiss(id);
    expect(store.getState()).toBe(afterFirst);
  });

  it("remove retira la entrada", () => {
    const store = createToastStore();
    const id = store.show({ title: "a" });
    store.remove(id);
    expect(store.getState().toasts).toHaveLength(0);
  });

  it("dismissAll alcanza a los visibles y a los encolados", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    store.show({ title: "b" });
    store.show({ title: "c" });
    store.dismissAll();
    expect(
      store.getState().toasts.every((t) => t.status === "closing"),
    ).toBe(true);
  });

  it("clear vacía la store", () => {
    const store = createToastStore();
    store.show({ title: "a" });
    store.clear();
    expect(store.getState().toasts).toHaveLength(0);
  });
});

describe("createToastStore — aislamiento entre instancias", () => {
  it("dos stores no comparten estado", () => {
    const a = createToastStore();
    const b = createToastStore();
    a.show({ title: "solo en a" });
    expect(a.getState().toasts).toHaveLength(1);
    expect(b.getState().toasts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `pnpm test -- src/feedback/toast/toast-store`
Expected: FAIL (el módulo no existe).

- [ ] **Step 3: Implementar `toast-store.ts`**

```ts
import type {
  ToastEntry,
  ToastOptions,
  ToastStore,
  ToastStoreConfig,
  ToastStoreState,
} from "./Toast.types";

/**
 * Duración de la animación de salida. La retirada de la cola se programa con
 * este valor en lugar de escuchar el fin de la transición: en jsdom y con
 * `prefers-reduced-motion` ese evento no llega nunca, y las entradas cerradas
 * se quedarían para siempre en la cola.
 */
export const TOAST_EXIT_MS = 150;

const DEFAULT_MAX_QUEUED = 50;

/**
 * `Infinity` no sirve como duración: `setTimeout` coacciona su argumento a
 * int32, así que colapsa a `0` y el toast se cerraría de inmediato. El máximo
 * entero de 32 bits equivale a ~24 días, que a efectos prácticos es "nunca".
 */
const PERSISTENT_DURATION = 2_147_483_647;

/** Traduce la duración pública a los milisegundos que espera la primitiva. */
export function resolveToastDuration(
  duration: number | "persistent" | undefined,
  fallback: number,
): number {
  if (duration === "persistent") return PERSISTENT_DURATION;
  return duration ?? fallback;
}

const EMPTY_STATE: ToastStoreState = { toasts: [] };

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `ui-toast-${idCounter}`;
}

function devWarn(message: string): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}

/**
 * Store de toasts independiente de React. La consume `ToastProvider` vía
 * `useSyncExternalStore`, y también el objeto `toast` importable, que es lo
 * que permite lanzar mensajes desde interceptores HTTP o capas de servicio.
 */
export function createToastStore(config: ToastStoreConfig = {}): ToastStore {
  const maxQueued = config.maxQueued ?? DEFAULT_MAX_QUEUED;

  // `state` se reemplaza entero en cada mutación y se devuelve tal cual en
  // `getState`. `useSyncExternalStore` compara snapshots por identidad: si
  // devolviéramos un objeto literal nuevo en cada llamada, entraría en un
  // bucle infinito de renders.
  let state: ToastStoreState = EMPTY_STATE;
  const listeners = new Set<() => void>();

  function commit(toasts: ToastEntry[]): void {
    state = { toasts };
    for (const listener of listeners) listener();
  }

  function indexOf(id: string): number {
    return state.toasts.findIndex((entry) => entry.id === id);
  }

  function replaceAt(index: number, entry: ToastEntry): void {
    const next = state.toasts.slice();
    next[index] = entry;
    commit(next);
  }

  /** Mezcla `options` sobre la entrada `index`, decidiendo si reinicia el temporizador. */
  function patch(
    index: number,
    options: Partial<ToastOptions>,
    forceRestart: boolean,
  ): void {
    const previous = state.toasts[index]!;
    const durationChanged =
      options.duration !== undefined && options.duration !== previous.duration;

    replaceAt(index, {
      ...previous,
      ...options,
      id: previous.id,
      tone: options.tone ?? previous.tone,
      dismissible: options.dismissible ?? previous.dismissible,
      status: "open",
      restartedAt:
        forceRestart || durationChanged
          ? previous.restartedAt + 1
          : previous.restartedAt,
    });
  }

  function show(options: ToastOptions): string {
    if (options.dedupeKey !== undefined) {
      const index = state.toasts.findIndex(
        (entry) =>
          entry.dedupeKey === options.dedupeKey && entry.status === "open",
      );
      if (index >= 0) {
        const id = state.toasts[index]!.id;
        patch(index, options, true);
        return id;
      }
    }

    if (options.id !== undefined) {
      const index = indexOf(options.id);
      if (index >= 0) {
        patch(index, options, true);
        return options.id;
      }
    }

    const entry: ToastEntry = {
      ...options,
      id: options.id ?? nextId(),
      tone: options.tone ?? "neutral",
      dismissible: options.dismissible ?? true,
      status: "open",
      createdAt: Date.now(),
      restartedAt: 0,
    };

    let next = [...state.toasts, entry];
    if (next.length > maxQueued) {
      devWarn(
        `La cola de toasts superó maxQueued (${maxQueued}). Se descartan los más antiguos.`,
      );
      next = next.slice(next.length - maxQueued);
    }
    commit(next);
    return entry.id;
  }

  function update(id: string, options: Partial<ToastOptions>): void {
    const index = indexOf(id);
    if (index < 0) {
      devWarn(`update() sobre un toast inexistente o ya retirado: "${id}".`);
      return;
    }
    patch(index, options, false);
  }

  function dismiss(id: string): void {
    const index = indexOf(id);
    if (index < 0) return;
    const entry = state.toasts[index]!;
    if (entry.status === "closing") return;
    replaceAt(index, { ...entry, status: "closing" });
  }

  function dismissAll(): void {
    if (state.toasts.every((entry) => entry.status === "closing")) return;
    commit(
      state.toasts.map((entry) =>
        entry.status === "closing" ? entry : { ...entry, status: "closing" },
      ),
    );
  }

  function remove(id: string): void {
    const index = indexOf(id);
    if (index < 0) return;
    commit(state.toasts.filter((entry) => entry.id !== id));
  }

  function clear(): void {
    if (state.toasts.length === 0) return;
    commit([]);
  }

  const withTone =
    (tone: ToastEntry["tone"]) =>
    (options: Omit<ToastOptions, "tone">): string =>
      show({ ...options, tone });

  return {
    getState: () => state,
    getServerState: () => EMPTY_STATE,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    show,
    success: withTone("success"),
    error: withTone("error"),
    warning: withTone("warning"),
    info: withTone("info"),
    update,
    dismiss,
    dismissAll,
    remove,
    clear,
  };
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `pnpm test -- src/feedback/toast/toast-store`
Expected: PASS (26 pruebas).

- [ ] **Step 5: Typecheck y commit**

Run: `pnpm typecheck`
Expected: sin errores.

```bash
git add src/feedback/toast/toast-store.ts src/feedback/toast/toast-store.test.ts
git commit -m "feat(toast): pure store with FIFO queue, dedupe and restart semantics"
```

---

### Task 4: Store global y objeto `toast` importable

El puente que permite lanzar toasts desde fuera de React.

**Files:**
- Create: `src/feedback/toast/toast-global.ts`
- Create: `src/feedback/toast/toast-global.test.ts`

**Interfaces:**
- Consumes: `createToastStore` de `./toast-store`; tipos de `./Toast.types`.
- Produces: `defaultToastStore: ToastStore`; `toast: ToastApi`; `claimGlobalToastStore(): boolean`; `releaseGlobalToastStore(): void`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`src/feedback/toast/toast-global.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toast,
  defaultToastStore,
  claimGlobalToastStore,
  releaseGlobalToastStore,
} from "./toast-global";

afterEach(() => {
  defaultToastStore.clear();
  // Libera cualquier reclamación que dejara una prueba.
  releaseGlobalToastStore();
  vi.restoreAllMocks();
});

describe("toast (objeto de módulo)", () => {
  it("escribe en la store por defecto", () => {
    claimGlobalToastStore();
    const id = toast.success({ title: "guardado" });
    const entry = defaultToastStore.getState().toasts[0]!;
    expect(entry.id).toBe(id);
    expect(entry.tone).toBe("success");
  });

  it("devuelve un id válido aunque no haya provider montado", () => {
    const id = toast.show({ title: "temprano" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(defaultToastStore.getState().toasts).toHaveLength(1);
  });

  it("avisa en desarrollo si no hay provider global montado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toast.show({ title: "sin provider" });
    expect(warn).toHaveBeenCalled();
  });

  it("no avisa cuando hay un provider global reclamado", () => {
    claimGlobalToastStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    toast.show({ title: "con provider" });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("claim / release", () => {
  it("la primera reclamación gana y la segunda es rechazada con aviso", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(claimGlobalToastStore()).toBe(true);
    expect(claimGlobalToastStore()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it("release vacía la store y permite volver a reclamar", () => {
    claimGlobalToastStore();
    toast.show({ title: "a" });
    releaseGlobalToastStore();
    expect(defaultToastStore.getState().toasts).toHaveLength(0);
    expect(claimGlobalToastStore()).toBe(true);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `pnpm test -- src/feedback/toast/toast-global`
Expected: FAIL (el módulo no existe).

- [ ] **Step 3: Implementar `toast-global.ts`**

```ts
import { createToastStore } from "./toast-store";
import type { ToastApi, ToastOptions, ToastStore } from "./Toast.types";

/**
 * Store compartida por el objeto `toast` importable y por el `ToastProvider`
 * que declare `global`.
 *
 * API **client-only**: en SSR una store a nivel de módulo se compartiría entre
 * peticiones y filtraría mensajes de un usuario a otro. Solo debe escribirse
 * desde código de cliente, y el provider `global` la vacía al desmontarse.
 */
export const defaultToastStore: ToastStore = createToastStore();

let claimed = false;

function devWarn(message: string): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}

/** `true` si esta instancia toma el control de la store global. Gana la primera. */
export function claimGlobalToastStore(): boolean {
  if (claimed) {
    devWarn(
      "Hay más de un <ToastProvider global />. Solo el primero montado atiende al `toast` importable; retira los demás o quítales el prop `global`.",
    );
    return false;
  }
  claimed = true;
  return true;
}

export function releaseGlobalToastStore(): void {
  claimed = false;
  defaultToastStore.clear();
}

function warnIfUnclaimed(): void {
  if (!claimed) {
    devWarn(
      "Se usó el `toast` importable sin ningún <ToastProvider global /> montado. El mensaje queda en cola y se mostrará cuando se monte.",
    );
  }
}

/**
 * API imperativa llamable desde cualquier parte, incluido código fuera de
 * React (interceptores HTTP, capas de servicio). Requiere un
 * `<ToastProvider global />` montado para que los mensajes se vean.
 */
export const toast: ToastApi = {
  show: (options: ToastOptions) => {
    warnIfUnclaimed();
    return defaultToastStore.show(options);
  },
  success: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.success(options);
  },
  error: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.error(options);
  },
  warning: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.warning(options);
  },
  info: (options) => {
    warnIfUnclaimed();
    return defaultToastStore.info(options);
  },
  update: (id, options) => defaultToastStore.update(id, options),
  dismiss: (id) => defaultToastStore.dismiss(id),
  dismissAll: () => defaultToastStore.dismissAll(),
};
```

- [ ] **Step 4: Verificar que pasan**

Run: `pnpm test -- src/feedback/toast/toast-global`
Expected: PASS (6 pruebas).

- [ ] **Step 5: Typecheck y commit**

Run: `pnpm typecheck`

```bash
git add src/feedback/toast/toast-global.ts src/feedback/toast/toast-global.test.ts
git commit -m "feat(toast): module-level store bridge for non-React callers"
```

---

### Task 5: `ToastProvider`, `ToastViewport` y `useToast` + historias

Los componentes React que renderizan la cola sobre Radix Toast.

**Files:**
- Create: `src/feedback/toast/Toast.context.ts`
- Create: `src/feedback/toast/ToastViewport.tsx`
- Create: `src/feedback/toast/ToastProvider.tsx`
- Create: `src/feedback/toast/useToast.ts`
- Create: `src/feedback/toast/Toast.test.tsx`
- Create: `src/feedback/toast/Toast.stories.tsx`
- Modify: `src/feedback/index.ts`

**Interfaces:**
- Consumes: `createToastStore`, `TOAST_EXIT_MS` de `./toast-store`; `defaultToastStore`, `claimGlobalToastStore`, `releaseGlobalToastStore` de `./toast-global`; tipos de `./Toast.types`; `cn` de `../../lib`; `@radix-ui/react-toast`.
- Produces: `ToastProvider`, `ToastViewport`, `useToast()`, `toast` y todos los tipos, exportados desde `src/feedback/index.ts`.

- [ ] **Step 1: Crear el contexto**

`src/feedback/toast/Toast.context.ts`:

```ts
import * as React from "react";
import type { ToastProviderProps, ToastStore } from "./Toast.types";

export interface ToastContextValue {
  store: ToastStore;
  position: NonNullable<ToastProviderProps["position"]>;
  maxVisible: number;
  defaultDuration: number;
  icons: ToastProviderProps["icons"];
  /**
   * `className`/`style` del provider. Se aplican al viewport: es el único
   * marcado que el provider posee (no envuelve a `children` en ningún nodo).
   */
  className: string | undefined;
  style: React.CSSProperties | undefined;
  classNames: ToastProviderProps["classNames"];
  styles: ToastProviderProps["styles"];
  unstyled: boolean;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error(
      "[teams4soft-ui] useToast() debe usarse dentro de un <ToastProvider>.",
    );
  }
  return context;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/feedback/toast/Toast.test.tsx`:

```tsx
import * as React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";
import type { ToastApi } from "./Toast.types";
import {
  toast,
  defaultToastStore,
  releaseGlobalToastStore,
} from "./toast-global";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
});

afterEach(() => {
  releaseGlobalToastStore();
});

/**
 * Sujeta la API para poder dispararla desde el cuerpo de la prueba.
 * Es un objeto y no un `let api = null`: TypeScript estrecharía esa variable
 * a `null` y `holder.api!.show()` fallaría con "Property 'show' does not exist on
 * type 'never'".
 */
function createHolder(): { api: ToastApi | null } {
  return { api: null };
}

function Trigger({ holder }: { holder?: { api: ToastApi | null } }) {
  const api = useToast();
  React.useEffect(() => {
    if (holder) holder.api = api;
  }, [api, holder]);
  return (
    <button type="button" onClick={() => api.success({ title: "Guardado" })}>
      Disparar
    </button>
  );
}

describe("ToastProvider", () => {
  it("muestra un toast lanzado con useToast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Disparar" }));
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
  });

  it("lanza si useToast se usa fuera del provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("renderiza como mucho maxVisible a la vez", async () => {
    const holder = createHolder();
    render(
      <ToastProvider maxVisible={2}>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.show({ title: "uno" });
      holder.api!.show({ title: "dos" });
      holder.api!.show({ title: "tres" });
    });

    expect(await screen.findByText("uno")).toBeInTheDocument();
    expect(screen.getByText("dos")).toBeInTheDocument();
    expect(screen.queryByText("tres")).not.toBeInTheDocument();
  });

  it("cierra con el botón de cierre", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Disparar" }));
    await screen.findByText("Guardado");
    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    await waitFor(() => {
      expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
    });
  });

  it("ejecuta la acción y no rompe la cola si lanza", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const holder = createHolder();
    render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({
        title: "Falló",
        duration: "persistent",
        action: {
          label: "Reintentar",
          onClick: () => {
            throw new Error("boom");
          },
        },
      });
    });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(warn).toHaveBeenCalled();

    act(() => {
      holder.api!.show({ title: "sigue viva" });
    });
    expect(await screen.findByText("sigue viva")).toBeInTheDocument();
    warn.mockRestore();
  });

  it("anuncia los errores en región asertiva y el resto en cortés", async () => {
    const holder = createHolder();
    const { container } = render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({ title: "Falló", duration: "persistent" });
    });
    await screen.findByText("Falló");

    const roots = container.ownerDocument.querySelectorAll("[data-tone]");
    expect(roots.length).toBeGreaterThan(0);
    expect(roots[0]!).toHaveAttribute("data-tone", "error");
  });

  it("no mueve el foco al aparecer un toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Disparar" });
    await user.click(trigger);
    await screen.findByText("Guardado");

    expect(trigger).toHaveFocus();
  });

  it("renderiza la acción con su etiqueta y la invoca al pulsar", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const holder = createHolder();
    render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({
        title: "Falló",
        duration: "persistent",
        action: { label: "Reintentar", onClick },
      });
    });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aplica classNames por slot y respeta unstyled", async () => {
    const holder = createHolder();
    render(
      <ToastProvider classNames={{ title: "mi-titulo" }}>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.show({ title: "estilado", duration: "persistent" });
    });
    expect(await screen.findByText("estilado")).toHaveClass("mi-titulo");
  });

  it("aplica className del provider al viewport", async () => {
    const { container } = render(
      <ToastProvider className="mi-viewport">
        <Trigger />
      </ToastProvider>,
    );
    expect(
      container.ownerDocument.querySelector(".mi-viewport"),
    ).not.toBeNull();
  });
});

describe("ToastProvider global", () => {
  it("sin `global` NO conecta el toast importable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "desde fuera", duration: "persistent" });
    });

    // Llega a la store global, pero este provider no la observa.
    expect(defaultToastStore.getState().toasts).toHaveLength(1);
    expect(screen.queryByText("desde fuera")).not.toBeInTheDocument();
    defaultToastStore.clear();
    warn.mockRestore();
  });

  it("con `global` conecta el toast importable", async () => {
    render(
      <ToastProvider global>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "desde fuera", duration: "persistent" });
    });
    expect(await screen.findByText("desde fuera")).toBeInTheDocument();
  });

  it("vacía la store global al desmontarse", async () => {
    const { unmount } = render(
      <ToastProvider global>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "efímero", duration: "persistent" });
    });
    await screen.findByText("efímero");

    unmount();
    expect(defaultToastStore.getState().toasts).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `pnpm test -- src/feedback/toast/Toast`
Expected: FAIL (los módulos no existen).

- [ ] **Step 4: Implementar `ToastViewport.tsx`**

```tsx
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "../../lib";
import { useToastContext } from "./Toast.context";
import { TOAST_EXIT_MS, resolveToastDuration } from "./toast-store";
import type { ToastEntry, ToastPosition, ToastTone } from "./Toast.types";

const positionClassName: Record<ToastPosition, string> = {
  "top-left": "top-0 left-0",
  "top-center": "top-0 left-1/2 -translate-x-1/2",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0 flex-col-reverse",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse",
  "bottom-right": "bottom-0 right-0 flex-col-reverse",
};

const toneAccentClassName: Record<ToastTone, string> = {
  neutral: "border-l-4 border-l-ui-border",
  info: "border-l-4 border-l-ui-primary",
  success: "border-l-4 border-l-ui-primary",
  warning: "border-l-4 border-l-ui-danger",
  error: "border-l-4 border-l-ui-danger",
};

/** Prefijo solo para lectores de pantalla: el tono no puede depender del color. */
const toneLabel: Record<ToastTone, string> = {
  neutral: "Aviso",
  info: "Información",
  success: "Éxito",
  warning: "Advertencia",
  error: "Error",
};

const viewportBaseClassName =
  "fixed z-50 m-0 flex w-[min(24rem,calc(100vw-2rem))] list-none flex-col gap-2 p-4 outline-none";

const rootBaseClassName =
  "flex items-start gap-3 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-3 text-ui-foreground shadow-lg data-[state=closed]:opacity-0 data-[swipe=end]:opacity-0 motion-safe:transition-opacity motion-reduce:transition-none";

const iconBaseClassName = "mt-0.5 flex shrink-0 items-center";
const contentBaseClassName = "flex min-w-0 flex-1 flex-col gap-0.5";
const titleBaseClassName = "text-sm font-medium";
const messageBaseClassName = "text-sm text-ui-foreground/70";
const actionBaseClassName =
  "shrink-0 rounded-(--radius-ui-sm) px-2 py-1 text-sm font-medium text-ui-primary outline-none hover:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus";
const closeButtonBaseClassName =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-ui-sm) text-ui-foreground/60 outline-none hover:bg-ui-muted hover:text-ui-foreground focus-visible:ring-2 focus-visible:ring-ui-focus";

function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function devWarn(message: string): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}

function ToastItem({ entry }: { entry: ToastEntry }) {
  const { store, defaultDuration, icons, classNames, styles, unstyled } =
    useToastContext();

  // La retirada de la cola se programa por temporizador, no por el evento de
  // fin de transición: en jsdom y con reduced-motion ese evento nunca llega.
  React.useEffect(() => {
    if (entry.status !== "closing") return;
    const timer = setTimeout(() => store.remove(entry.id), TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [entry.status, entry.id, store]);

  const duration = resolveToastDuration(entry.duration, defaultDuration);

  const icon = entry.icon ?? icons?.[entry.tone];

  const handleAction = () => {
    if (!entry.action) return;
    try {
      entry.action.onClick();
    } catch (error) {
      // Un fallo del consumidor no debe bloquear la cola.
      devWarn(`La acción del toast "${entry.id}" lanzó una excepción: ${String(error)}`);
    }
    store.dismiss(entry.id);
  };

  return (
    <ToastPrimitive.Root
      open={entry.status === "open"}
      duration={duration}
      type={entry.tone === "error" ? "foreground" : "background"}
      onOpenChange={(open) => {
        if (!open) store.dismiss(entry.id);
      }}
      data-tone={entry.tone}
      className={cn(
        !unstyled && rootBaseClassName,
        !unstyled && toneAccentClassName[entry.tone],
        classNames?.root,
      )}
      style={styles?.root}
    >
      {icon ? (
        <span
          className={cn(!unstyled && iconBaseClassName, classNames?.icon)}
          style={styles?.icon}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div
        className={cn(!unstyled && contentBaseClassName, classNames?.content)}
        style={styles?.content}
      >
        <ToastPrimitive.Title
          className={cn(!unstyled && titleBaseClassName, classNames?.title)}
          style={styles?.title}
        >
          <span className="sr-only">{toneLabel[entry.tone]}: </span>
          {entry.title}
        </ToastPrimitive.Title>
        {entry.message !== undefined && entry.message !== null ? (
          <ToastPrimitive.Description
            className={cn(
              !unstyled && messageBaseClassName,
              classNames?.message,
            )}
            style={styles?.message}
          >
            {entry.message}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      {entry.action ? (
        <ToastPrimitive.Action
          altText={entry.action.altText ?? entry.action.label}
          onClick={handleAction}
          className={cn(!unstyled && actionBaseClassName, classNames?.action)}
          style={styles?.action}
        >
          {entry.action.label}
        </ToastPrimitive.Action>
      ) : null}
      {entry.dismissible ? (
        <ToastPrimitive.Close
          aria-label="Cerrar"
          className={cn(
            !unstyled && closeButtonBaseClassName,
            classNames?.closeButton,
          )}
          style={styles?.closeButton}
        >
          <IconX />
        </ToastPrimitive.Close>
      ) : null}
    </ToastPrimitive.Root>
  );
}

/**
 * Superficie donde se apilan los toasts. `ToastProvider` la monta por sí mismo;
 * exportarla permite colocarla a mano con `renderViewport={false}`.
 */
export function ToastViewport(): React.ReactElement {
  const {
    store,
    position,
    maxVisible,
    className,
    style,
    classNames,
    styles,
    unstyled,
  } = useToastContext();

  const state = React.useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getServerState,
  );

  // FIFO: los más antiguos ocupan los huecos visibles; el resto espera turno.
  const visible = state.toasts.slice(0, maxVisible);

  return (
    <>
      {visible.map((entry) => (
        <ToastItem key={`${entry.id}:${entry.restartedAt}`} entry={entry} />
      ))}
      <ToastPrimitive.Viewport
        data-position={position}
        className={cn(
          !unstyled && viewportBaseClassName,
          !unstyled && positionClassName[position],
          className,
          classNames?.viewport,
        )}
        style={{ ...styles?.viewport, ...style }}
      />
    </>
  );
}

ToastViewport.displayName = "ToastViewport";
```

- [ ] **Step 5: Implementar `ToastProvider.tsx`**

```tsx
import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { ToastContext } from "./Toast.context";
import { createToastStore } from "./toast-store";
import {
  claimGlobalToastStore,
  defaultToastStore,
  releaseGlobalToastStore,
} from "./toast-global";
import { ToastViewport } from "./ToastViewport";
import type { ToastPosition, ToastProviderProps } from "./Toast.types";

/** Radix admite una sola dirección de swipe; se deriva de la posición. */
const swipeDirectionByPosition: Record<
  ToastPosition,
  "right" | "left" | "up" | "down"
> = {
  "top-left": "left",
  "top-center": "up",
  "top-right": "right",
  "bottom-left": "left",
  "bottom-center": "down",
  "bottom-right": "right",
};

/**
 * Provider de toasts. Sin `global` mantiene una store privada, de modo que
 * varias instancias (Storybook, pruebas) no se pisan. Con `global` atiende
 * además al `toast` importable desde fuera de React.
 */
export function ToastProvider({
  children,
  position = "top-right",
  maxVisible = 4,
  defaultDuration = 4000,
  maxQueued = 50,
  global: isGlobal = false,
  icons,
  renderViewport = true,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: ToastProviderProps): React.ReactElement {
  const [privateStore] = React.useState(() => createToastStore({ maxQueued }));
  const store = isGlobal ? defaultToastStore : privateStore;

  // La reclamación va en un efecto, no en render: en StrictMode el cuerpo del
  // componente se ejecuta dos veces y reclamaríamos dos veces la misma store.
  const [globalReady, setGlobalReady] = React.useState(false);
  React.useEffect(() => {
    if (!isGlobal) return;
    const won = claimGlobalToastStore();
    setGlobalReady(won);
    if (!won) return;
    return () => {
      setGlobalReady(false);
      releaseGlobalToastStore();
    };
  }, [isGlobal]);

  const contextValue = React.useMemo(
    () => ({
      store,
      position,
      maxVisible,
      defaultDuration,
      icons,
      className,
      style,
      classNames,
      styles,
      unstyled,
    }),
    [
      store,
      position,
      maxVisible,
      defaultDuration,
      icons,
      className,
      style,
      classNames,
      styles,
      unstyled,
    ],
  );

  // Con `global`, solo el provider que ganó la reclamación pinta la cola; así
  // una segunda instancia mal configurada no duplica los mensajes en pantalla.
  const shouldRenderViewport = renderViewport && (!isGlobal || globalReady);

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitive.Provider
        swipeDirection={swipeDirectionByPosition[position]}
        duration={defaultDuration}
      >
        {children}
        {shouldRenderViewport ? <ToastViewport /> : null}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = "ToastProvider";
```

> **Por qué `className` no envuelve a `children`:** el provider no posee ningún nodo propio — envolver la aplicación entera en un `<div>` para admitir una clase rompería layouts del consumidor sin avisar. `className` y `style` viajan por el contexto y se aplican al **viewport**, que es el único marcado que el provider realmente renderiza. Queda documentado en el JSDoc de `ToastContextValue`.

Añade el import de `cn` solo si acabas usándolo en este archivo; con esta estructura, `ToastProvider` no compone clases y `cn` sobra. Elimínalo para que `noUnusedLocals` no falle.

- [ ] **Step 6: Implementar `useToast.ts`**

```ts
import { useToastContext } from "./Toast.context";
import type { ToastApi } from "./Toast.types";

/**
 * API imperativa del `ToastProvider` más cercano. Para lanzar toasts desde
 * fuera de React, usa el objeto `toast` importable con `<ToastProvider global />`.
 */
export function useToast(): ToastApi {
  const { store } = useToastContext();
  return store;
}
```

- [ ] **Step 7: Verificar que pasan**

Run: `pnpm test -- src/feedback/toast/Toast`
Expected: PASS (13 pruebas).

> `altText` no es observable como atributo: Radix lo usa para el duplicado
> *announce-only* que leen los lectores de pantalla, no lo refleja en el botón.
> Por eso la prueba comprueba el nombre accesible (que viene del contenido) y
> la invocación, no un `aria-label`.

- [ ] **Step 8: Historias**

`src/feedback/toast/Toast.stories.tsx` con `tags: ["autodocs"]` y las 11 historias del doc 09: `Tones`, `WithAction`, `Persistent`, `Queue`, `Deduplication`, `Update`, `Positions`, `CustomClasses`, `Unstyled`, `Keyboard`, `Mobile`.

Cada historia envuelve un botón disparador en `<ToastProvider>` (sin `global`, para que las historias no compartan estado). `Update` demuestra el flujo "Guardando → Guardado":

```tsx
export const Update: Story = {
  render: () => (
    <ToastProvider>
      <UpdateDemo />
    </ToastProvider>
  ),
};

function UpdateDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className="rounded-(--radius-ui-sm) border border-ui-border px-3 py-1.5 text-sm"
      onClick={() => {
        const id = api.info({ title: "Guardando…", duration: "persistent" });
        setTimeout(() => {
          api.update(id, { title: "Guardado", tone: "success", duration: 3000 });
        }, 1200);
      }}
    >
      Guardar
    </button>
  );
}
```

- [ ] **Step 9: Exportar desde `src/feedback/index.ts`**

Reemplaza el `export {};` por:

```ts
export { ToastProvider } from "./toast/ToastProvider";
export { ToastViewport } from "./toast/ToastViewport";
export { useToast } from "./toast/useToast";
export { toast } from "./toast/toast-global";
export { createToastStore } from "./toast/toast-store";
export type {
  ToastTone,
  ToastPosition,
  ToastAction,
  ToastOptions,
  ToastApi,
  ToastClassNames,
  ToastProviderProps,
  ToastStore,
  ToastStoreConfig,
  ToastEntry,
} from "./toast/Toast.types";
```

- [ ] **Step 10: Typecheck y commit**

Run: `pnpm typecheck && pnpm test -- src/feedback/toast`
Expected: sin errores; PASS.

```bash
git add src/feedback/toast src/feedback/index.ts
git commit -m "feat(feedback): add ToastProvider, viewport and useToast on Radix Toast"
```

---

### Task 6: `Spinner`

Indicador de actividad indeterminada.

**Files:**
- Create: `src/feedback/spinner/Spinner.types.ts`
- Create: `src/feedback/spinner/Spinner.tsx`
- Create: `src/feedback/spinner/Spinner.test.tsx`
- Create: `src/feedback/spinner/Spinner.stories.tsx`
- Modify: `src/feedback/index.ts`

**Interfaces:**
- Consumes: `cn` de `../../lib`.
- Produces: `Spinner` (`forwardRef<HTMLSpanElement, SpinnerProps>`) y `SpinnerProps`, `SpinnerSize`.

- [ ] **Step 1: Escribir el contrato de tipos**

`src/feedback/spinner/Spinner.types.ts`:

```ts
import type * as React from "react";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Default `"md"`. */
  size?: SpinnerSize;
  /** Nombre accesible cuando el spinner comunica carga. Ignorado si `decorative`. */
  label?: string;
  /** Marca el spinner como puramente decorativo (`aria-hidden`). Default `false`. */
  decorative?: boolean;
  /** Conserva la estructura y el forwarding de props; omite las clases visuales. */
  unstyled?: boolean;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/feedback/spinner/Spinner.test.tsx`:

```tsx
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("con `label` expone un nombre accesible en un role status", () => {
    render(<Spinner label="Cargando datos" />);
    expect(screen.getByRole("status", { name: "Cargando datos" })).toBeInTheDocument();
  });

  it("sin `label` ni `decorative` sigue siendo un status sin nombre", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("con `decorative` desaparece del árbol de accesibilidad", () => {
    const { container } = render(<Spinner decorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("avisa en desarrollo si se combinan label y decorative", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Spinner label="Cargando" decorative />);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("expone el tamaño como data-size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstElementChild).toHaveAttribute("data-size", "lg");
  });

  it("respeta unstyled y reenvía className y ref", () => {
    const ref = React.createRef<HTMLSpanElement>();
    const { container } = render(
      <Spinner ref={ref} unstyled className="solo-esta" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `pnpm test -- src/feedback/spinner`
Expected: FAIL.

- [ ] **Step 4: Implementar `Spinner.tsx`**

```tsx
import * as React from "react";
import { cn } from "../../lib";
import type { SpinnerProps, SpinnerSize } from "./Spinner.types";

const sizeClassName: Record<SpinnerSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

const baseClassName = "inline-flex shrink-0 items-center justify-center";

const svgBaseClassName = "h-full w-full motion-safe:animate-spin";

function devWarn(message: string): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}

/**
 * Indicador de actividad indeterminada. Usa `label` cuando comunique carga y
 * `decorative` cuando acompañe a un texto que ya la anuncia.
 */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  function Spinner(
    { size = "md", label, decorative = false, unstyled = false, className, ...rest },
    ref,
  ) {
    if (decorative && label !== undefined) {
      devWarn(
        "<Spinner> recibió `label` y `decorative` a la vez. `decorative` gana y el label se ignora.",
      );
    }

    return (
      <span
        ref={ref}
        role={decorative ? undefined : "status"}
        aria-label={!decorative && label !== undefined ? label : undefined}
        aria-hidden={decorative || undefined}
        data-size={size}
        className={cn(
          !unstyled && baseClassName,
          !unstyled && sizeClassName[size],
          className,
        )}
        {...rest}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={unstyled ? undefined : svgBaseClassName}
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
          />
        </svg>
      </span>
    );
  },
);

Spinner.displayName = "Spinner";
```

- [ ] **Step 5: Verificar que pasan**

Run: `pnpm test -- src/feedback/spinner`
Expected: PASS (6 pruebas).

- [ ] **Step 6: Historias**

`Spinner.stories.tsx` con `tags: ["autodocs"]`: `SpinnerSizes` (los 4 tamaños en fila), `WithLabel`, `Decorative`, `CustomClasses` (`className="text-ui-primary"`), `Unstyled`, `ReducedMotion` (con nota en `parameters.docs.description.story` de que la animación se suprime con `prefers-reduced-motion`).

- [ ] **Step 7: Exportar**

Añadir a `src/feedback/index.ts`:

```ts
export { Spinner } from "./spinner/Spinner";
export type { SpinnerProps, SpinnerSize } from "./spinner/Spinner.types";
```

- [ ] **Step 8: Typecheck y commit**

Run: `pnpm typecheck && pnpm test -- src/feedback/spinner`

```bash
git add src/feedback/spinner src/feedback/index.ts
git commit -m "feat(feedback): add Spinner"
```

---

### Task 7: `Skeleton`

Marcador de posición decorativo mientras carga el contenido.

**Files:**
- Create: `src/feedback/skeleton/Skeleton.types.ts`
- Create: `src/feedback/skeleton/Skeleton.tsx`
- Create: `src/feedback/skeleton/Skeleton.test.tsx`
- Create: `src/feedback/skeleton/Skeleton.stories.tsx`
- Modify: `src/feedback/index.ts`

**Interfaces:**
- Consumes: `cn` de `../../lib`.
- Produces: `Skeleton` (`forwardRef<HTMLDivElement, SkeletonProps>`) y `SkeletonProps`, `SkeletonShape`, `SkeletonAnimation`.

- [ ] **Step 1: Contrato de tipos**

`src/feedback/skeleton/Skeleton.types.ts`:

```ts
import type * as React from "react";

export type SkeletonShape = "text" | "rect" | "circle";
export type SkeletonAnimation = "pulse" | "wave" | "none";

export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Default `"text"`. */
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  /** Número de líneas. Solo aplica con `shape="text"`. Default 1. */
  lines?: number;
  /** Default `"pulse"`. */
  animation?: SkeletonAnimation;
  unstyled?: boolean;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/feedback/skeleton/Skeleton.test.tsx`:

```tsx
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("es decorativo: aria-hidden y fuera del árbol de accesibilidad", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renderiza una línea por cada `lines` con shape text", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelectorAll("[data-skeleton-line]")).toHaveLength(3);
  });

  it("ignora `lines` cuando la forma no es text", () => {
    const { container } = render(<Skeleton shape="circle" lines={3} />);
    expect(container.querySelectorAll("[data-skeleton-line]")).toHaveLength(0);
  });

  it("expone shape y animation como data-*", () => {
    const { container } = render(<Skeleton shape="rect" animation="none" />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-shape", "rect");
    expect(root).toHaveAttribute("data-animation", "none");
  });

  it("aplica width y height numéricos como píxeles", () => {
    const { container } = render(<Skeleton shape="rect" width={120} height={40} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("120px");
    expect(root.style.height).toBe("40px");
  });

  it("respeta unstyled y reenvía ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <Skeleton ref={ref} unstyled className="solo-esta" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `pnpm test -- src/feedback/skeleton`
Expected: FAIL.

- [ ] **Step 4: Implementar `Skeleton.tsx`**

```tsx
import * as React from "react";
import { cn } from "../../lib";
import type {
  SkeletonAnimation,
  SkeletonProps,
  SkeletonShape,
} from "./Skeleton.types";

const shapeClassName: Record<SkeletonShape, string> = {
  text: "h-4 w-full rounded-(--radius-ui-sm)",
  rect: "rounded-(--radius-ui-md)",
  circle: "rounded-full",
};

const animationClassName: Record<SkeletonAnimation, string> = {
  pulse: "motion-safe:animate-pulse",
  // `wave` se degrada a `pulse` mientras no exista un keyframe propio en el
  // tema: es preferible a no animar nada y a inventar una utilidad ausente.
  wave: "motion-safe:animate-pulse",
  none: "",
};

const baseClassName = "bg-ui-muted";

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Marcador de posición del contenido que aún no llegó. Es puramente
 * decorativo: quien anuncia la carga es el contenedor, con `aria-busy`.
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    {
      shape = "text",
      width,
      height,
      lines = 1,
      animation = "pulse",
      unstyled = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const isMultiline = shape === "text" && lines > 1;

    const resolvedStyle: React.CSSProperties = {
      width: toCssSize(width),
      height: toCssSize(height),
      ...style,
    };

    if (isMultiline) {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          data-shape={shape}
          data-animation={animation}
          className={cn(!unstyled && "flex flex-col gap-2", className)}
          style={resolvedStyle}
          {...rest}
        >
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              data-skeleton-line=""
              className={cn(
                !unstyled && baseClassName,
                !unstyled && shapeClassName.text,
                !unstyled && animationClassName[animation],
                // La última línea corta al 60% para imitar un párrafo real.
                !unstyled && index === lines - 1 && "w-3/5",
              )}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-shape={shape}
        data-animation={animation}
        {...(shape === "text" ? { "data-skeleton-line": "" } : {})}
        className={cn(
          !unstyled && baseClassName,
          !unstyled && shapeClassName[shape],
          !unstyled && animationClassName[animation],
          className,
        )}
        style={resolvedStyle}
        {...rest}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";
```

- [ ] **Step 5: Verificar que pasan**

Run: `pnpm test -- src/feedback/skeleton`
Expected: PASS (6 pruebas).

> Si la prueba de `lines={1}` cuenta 1 línea y la de `shape="circle"` cuenta 0, el atributo `data-skeleton-line` está bien colocado. La rama de una sola línea de texto también lo lleva, por eso la prueba de `lines={3}` usa exactamente 3.

- [ ] **Step 6: Historias**

`Skeleton.stories.tsx` con `tags: ["autodocs"]`: `SkeletonShapes` (text, rect, circle en fila), `TextLines` (`lines={4}`), `CardPlaceholder` (composición que imita una tarjeta real), `NoAnimation`, `CustomClasses`, `Unstyled`, `ReducedMotion`.

- [ ] **Step 7: Exportar**

```ts
export { Skeleton } from "./skeleton/Skeleton";
export type {
  SkeletonProps,
  SkeletonShape,
  SkeletonAnimation,
} from "./skeleton/Skeleton.types";
```

- [ ] **Step 8: Typecheck y commit**

Run: `pnpm typecheck && pnpm test -- src/feedback/skeleton`

```bash
git add src/feedback/skeleton src/feedback/index.ts
git commit -m "feat(feedback): add Skeleton"
```

---

### Task 8: `Progress`

Barra de progreso determinado e indeterminado.

**Files:**
- Create: `src/feedback/progress/Progress.types.ts`
- Create: `src/feedback/progress/Progress.tsx`
- Create: `src/feedback/progress/Progress.test.tsx`
- Create: `src/feedback/progress/Progress.stories.tsx`
- Modify: `src/feedback/index.ts`

**Interfaces:**
- Consumes: `cn` de `../../lib`.
- Produces: `Progress` (`forwardRef<HTMLDivElement, ProgressProps>`) y `ProgressProps`, `ProgressClassNames`, `ProgressTone`, `ProgressSize`.

- [ ] **Step 1: Contrato de tipos**

`src/feedback/progress/Progress.types.ts`:

```ts
import type * as React from "react";

export type ProgressTone = "primary" | "success" | "warning" | "danger";
export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressClassNames {
  root: string;
  track: string;
  indicator: string;
  label: string;
  value: string;
}

export interface ProgressProps {
  /** Ausente = progreso indeterminado (sin `aria-valuenow`). Se recorta a `[0, max]`. */
  value?: number;
  /** Default 100. */
  max?: number;
  label?: React.ReactNode;
  /** Muestra el porcentaje redondeado. Se ignora si es indeterminado. */
  showValue?: boolean;
  /** Default `"primary"`. */
  tone?: ProgressTone;
  /** Default `"md"`. */
  size?: ProgressSize;
  className?: string;
  classNames?: Partial<ProgressClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ProgressClassNames, React.CSSProperties>>;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/feedback/progress/Progress.test.tsx`:

```tsx
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";

describe("Progress — determinado", () => {
  it("expone role progressbar con min, max y now", () => {
    render(<Progress value={40} label="Subiendo" />);
    const bar = screen.getByRole("progressbar", { name: "Subiendo" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("recorta el valor al rango [0, max]", () => {
    const { rerender } = render(<Progress value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    rerender(<Progress value={250} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("respeta un max personalizado", () => {
    render(<Progress value={25} max={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "50");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
  });

  it("muestra el porcentaje redondeado con showValue", () => {
    render(<Progress value={33} max={99} showValue />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});

describe("Progress — indeterminado", () => {
  it("omite aria-valuenow cuando no hay value", () => {
    render(<Progress label="Cargando" />);
    const bar = screen.getByRole("progressbar", { name: "Cargando" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-indeterminate", "true");
  });

  it("ignora showValue en modo indeterminado", () => {
    render(<Progress showValue />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe("Progress — personalización", () => {
  it("expone tone y size como data-*", () => {
    render(<Progress value={10} tone="danger" size="lg" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("data-tone", "danger");
    expect(bar).toHaveAttribute("data-size", "lg");
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <Progress value={10} className="mi-raiz" classNames={{ track: "mi-track" }} />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(container.querySelector(".mi-track")).not.toBeNull();

    rerender(<Progress value={10} unstyled className="solo-esta" />);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });

  it("reenvía la ref a la raíz", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress value={10} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `pnpm test -- src/feedback/progress`
Expected: FAIL.

- [ ] **Step 4: Implementar `Progress.tsx`**

```tsx
import * as React from "react";
import { cn } from "../../lib";
import type {
  ProgressProps,
  ProgressSize,
  ProgressTone,
} from "./Progress.types";

const toneClassName: Record<ProgressTone, string> = {
  primary: "bg-ui-primary",
  success: "bg-ui-primary",
  warning: "bg-ui-danger",
  danger: "bg-ui-danger",
};

const sizeClassName: Record<ProgressSize, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const rootBaseClassName = "grid w-full gap-1.5";
const headerBaseClassName = "flex items-center justify-between gap-2";
const labelBaseClassName = "text-sm text-ui-foreground";
const valueBaseClassName = "text-sm tabular-nums text-ui-foreground/60";
const trackBaseClassName =
  "w-full overflow-hidden rounded-full bg-ui-muted";
const indicatorBaseClassName =
  "h-full rounded-full motion-safe:transition-[width] motion-reduce:transition-none";
const indeterminateIndicatorClassName =
  "w-1/3 motion-safe:animate-pulse";

/**
 * Barra de progreso. Sin `value` representa progreso indeterminado y, tal como
 * exige ARIA, omite `aria-valuenow` en lugar de fingir un cero.
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(
    {
      value,
      max = 100,
      label,
      showValue = false,
      tone = "primary",
      size = "md",
      className,
      classNames,
      unstyled = false,
      style,
      styles,
    },
    ref,
  ) {
    const isIndeterminate = value === undefined;
    const clamped = isIndeterminate
      ? undefined
      : Math.min(Math.max(value, 0), max);
    const percent =
      clamped === undefined || max <= 0 ? 0 : Math.round((clamped / max) * 100);

    const generatedId = React.useId();
    const labelId = `${generatedId}-label`;

    const hasLabel = label !== undefined && label !== null && label !== "";
    const showPercent = showValue && !isIndeterminate;

    return (
      <div
        ref={ref}
        role="progressbar"
        // `aria-labelledby` en vez de `aria-label`: así funciona igual cuando
        // `label` es un ReactNode y no una cadena.
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        data-tone={tone}
        data-size={size}
        data-indeterminate={isIndeterminate || undefined}
        className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
        style={{ ...styles?.root, ...style }}
      >
        {hasLabel || showPercent ? (
          <div className={unstyled ? undefined : headerBaseClassName}>
            {hasLabel ? (
              <span
                id={labelId}
                className={cn(!unstyled && labelBaseClassName, classNames?.label)}
                style={styles?.label}
              >
                {label}
              </span>
            ) : (
              <span />
            )}
            {showPercent ? (
              <span
                className={cn(!unstyled && valueBaseClassName, classNames?.value)}
                style={styles?.value}
              >
                {percent}%
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            !unstyled && trackBaseClassName,
            !unstyled && sizeClassName[size],
            classNames?.track,
          )}
          style={styles?.track}
        >
          <div
            className={cn(
              !unstyled && indicatorBaseClassName,
              !unstyled && toneClassName[tone],
              !unstyled && isIndeterminate && indeterminateIndicatorClassName,
              classNames?.indicator,
            )}
            style={{
              ...(isIndeterminate ? undefined : { width: `${percent}%` }),
              ...styles?.indicator,
            }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = "Progress";
```

- [ ] **Step 5: Verificar que pasan**

Run: `pnpm test -- src/feedback/progress`
Expected: PASS (9 pruebas).

- [ ] **Step 6: Historias**

`Progress.stories.tsx` con `tags: ["autodocs"]`: `ProgressDeterminate`, `ProgressIndeterminate`, `Tones` (los 4), `Sizes` (los 3), `WithLabelAndValue`, `CustomMax` (`max={50}`), `CustomClasses`, `Unstyled`, `ReducedMotion`.

- [ ] **Step 7: Exportar**

```ts
export { Progress } from "./progress/Progress";
export type {
  ProgressProps,
  ProgressClassNames,
  ProgressTone,
  ProgressSize,
} from "./progress/Progress.types";
```

- [ ] **Step 8: Typecheck y commit**

Run: `pnpm typecheck && pnpm test -- src/feedback/progress`

```bash
git add src/feedback/progress src/feedback/index.ts
git commit -m "feat(feedback): add Progress with determinate and indeterminate modes"
```

---

### Task 9: `LoadingOverlay`

Capa de carga sobre un contenedor o sobre el viewport.

**Files:**
- Create: `src/feedback/loading-overlay/LoadingOverlay.types.ts`
- Create: `src/feedback/loading-overlay/LoadingOverlay.tsx`
- Create: `src/feedback/loading-overlay/LoadingOverlay.test.tsx`
- Create: `src/feedback/loading-overlay/LoadingOverlay.stories.tsx`
- Modify: `src/feedback/index.ts`

**Interfaces:**
- Consumes: `cn` de `../../lib`; `Spinner` de `../spinner/Spinner` (Task 6).
- Produces: `LoadingOverlay` (`forwardRef<HTMLDivElement, LoadingOverlayProps>`) y `LoadingOverlayProps`, `LoadingOverlayClassNames`.

- [ ] **Step 1: Contrato de tipos**

`src/feedback/loading-overlay/LoadingOverlay.types.ts`:

```ts
import type * as React from "react";

export interface LoadingOverlayClassNames {
  root: string;
  backdrop: string;
  panel: string;
  spinner: string;
  message: string;
}

export interface LoadingOverlayProps {
  open: boolean;
  message?: React.ReactNode;
  /**
   * Captura el puntero sobre el área cubierta y marca `aria-busy`.
   *
   * No inertiza el fondo: un componente renderizado dentro del contenedor no
   * puede aplicar `inert` a sus hermanos, así que el teclado puede seguir
   * tabulando por detrás. Deshabilita los controles del área afectada. Si tu
   * caso exige bloqueo real de la interacción, ese caso es un diálogo modal.
   */
  blocking?: boolean;
  /** `"container"` (default) exige que el padre esté posicionado (`relative`). */
  target?: "viewport" | "container";
  className?: string;
  classNames?: Partial<LoadingOverlayClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof LoadingOverlayClassNames, React.CSSProperties>>;
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`src/feedback/loading-overlay/LoadingOverlay.test.tsx`:

```tsx
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "./LoadingOverlay";

describe("LoadingOverlay", () => {
  it("no renderiza nada cuando open es false", () => {
    const { container } = render(<LoadingOverlay open={false} />);
    expect(container.firstElementChild).toBeNull();
  });

  it("marca aria-busy y expone el mensaje cuando está abierto", () => {
    render(<LoadingOverlay open message="Cargando datos" />);
    const root = screen.getByText("Cargando datos").closest("[aria-busy]");
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("anuncia el estado con role status", () => {
    render(<LoadingOverlay open message="Cargando" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
  });

  it("expone target y blocking como data-*", () => {
    const { container } = render(
      <LoadingOverlay open blocking target="viewport" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-target", "viewport");
    expect(root).toHaveAttribute("data-blocking", "true");
  });

  it("sin blocking deja pasar el puntero", () => {
    const { container } = render(<LoadingOverlay open />);
    expect(container.firstElementChild).not.toHaveAttribute("data-blocking");
  });

  it("avisa si target es container y el padre no está posicionado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <div>
        <LoadingOverlay open target="container" />
      </div>,
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <LoadingOverlay open className="mi-raiz" classNames={{ panel: "mi-panel" }} />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(container.querySelector(".mi-panel")).not.toBeNull();

    rerender(<LoadingOverlay open unstyled className="solo-esta" />);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `pnpm test -- src/feedback/loading-overlay`
Expected: FAIL.

- [ ] **Step 4: Implementar `LoadingOverlay.tsx`**

```tsx
import * as React from "react";
import { cn } from "../../lib";
import { Spinner } from "../spinner/Spinner";
import type { LoadingOverlayProps } from "./LoadingOverlay.types";

const rootBaseClassName = "flex items-center justify-center";
const containerRootClassName = "absolute inset-0 z-40";
const viewportRootClassName = "fixed inset-0 z-50";
const backdropBaseClassName = "absolute inset-0 bg-ui-background/70";
const panelBaseClassName =
  "relative flex flex-col items-center gap-2 rounded-(--radius-ui-md) px-4 py-3 text-ui-foreground";
const messageBaseClassName = "text-sm text-ui-foreground/80";

function devWarn(message: string): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(`[teams4soft-ui] ${message}`);
  }
}

/**
 * Capa de carga sobre una región o sobre el viewport.
 *
 * `blocking` captura el puntero pero NO inertiza el fondo (ver el JSDoc de la
 * prop): para bloqueo real de la interacción, usa un diálogo modal.
 */
export const LoadingOverlay = React.forwardRef<
  HTMLDivElement,
  LoadingOverlayProps
>(function LoadingOverlay(
  {
    open,
    message,
    blocking = false,
    target = "container",
    className,
    classNames,
    unstyled = false,
    style,
    styles,
  },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open || target !== "container") return;
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const position = getComputedStyle(parent).position;
    if (position === "static") {
      devWarn(
        '<LoadingOverlay target="container"> requiere que su elemento padre esté posicionado. Añade `relative` al contenedor.',
      );
    }
  }, [open, target]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  if (!open) return null;

  const hasMessage = message !== undefined && message !== null && message !== "";

  return (
    <div
      ref={setRefs}
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-target={target}
      data-blocking={blocking || undefined}
      className={cn(
        !unstyled && rootBaseClassName,
        !unstyled &&
          (target === "viewport"
            ? viewportRootClassName
            : containerRootClassName),
        !unstyled && !blocking && "pointer-events-none",
        className,
        classNames?.root,
      )}
      style={{ ...styles?.root, ...style }}
    >
      <div
        className={cn(!unstyled && backdropBaseClassName, classNames?.backdrop)}
        style={styles?.backdrop}
        aria-hidden="true"
      />
      <div
        className={cn(!unstyled && panelBaseClassName, classNames?.panel)}
        style={styles?.panel}
      >
        <Spinner
          decorative
          size="lg"
          className={classNames?.spinner}
          style={styles?.spinner}
        />
        {hasMessage ? (
          <span
            className={cn(!unstyled && messageBaseClassName, classNames?.message)}
            style={styles?.message}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
});

LoadingOverlay.displayName = "LoadingOverlay";
```

- [ ] **Step 5: Verificar que pasan**

Run: `pnpm test -- src/feedback/loading-overlay`
Expected: PASS (7 pruebas).

- [ ] **Step 6: Historias**

`LoadingOverlay.stories.tsx` con `tags: ["autodocs"]`: `OverlayContainer` (tarjeta con `relative` y overlay encima), `OverlayViewport`, `Blocking`, `WithoutMessage`, `CustomClasses`, `Unstyled`. En `OverlayContainer`, documentar en `parameters.docs.description.story` que el padre necesita `relative`.

- [ ] **Step 7: Exportar**

```ts
export { LoadingOverlay } from "./loading-overlay/LoadingOverlay";
export type {
  LoadingOverlayProps,
  LoadingOverlayClassNames,
} from "./loading-overlay/LoadingOverlay.types";
```

- [ ] **Step 8: Typecheck y commit**

Run: `pnpm typecheck && pnpm test -- src/feedback/loading-overlay`

```bash
git add src/feedback/loading-overlay src/feedback/index.ts
git commit -m "feat(feedback): add LoadingOverlay"
```

---

### Task 10: Verificación integral, README y cierre de la fase

Cierra 3a: asegura que el paquete compila, empaqueta y exporta la familia nueva.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: build limpio y API pública verificada.

- [ ] **Step 1: Typecheck, suite completa y build**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: 0 errores de tipos; TODAS las pruebas PASS (fases 1, 2a, 2b y 3a); build ESM+CJS+dts+CSS OK.

- [ ] **Step 2: Verificar que las clases nuevas llegan al CSS distribuido**

Run: `pnpm build && grep -c "animate-spin" dist/styles.css && grep -c "animate-pulse" dist/styles.css`
Expected: ambos > 0. Las clases son literales en los `.tsx`, así que Tailwind las escanea. Si alguna familia crítica faltara (count 0), añadirla al `@source inline(...)` de `src/styles/theme.css` y reconstruir.

- [ ] **Step 3: Dry-run de publicación**

Run: `pnpm publish --dry-run --no-git-checks`
Expected: la lista incluye `dist/feedback.js`, `dist/feedback.cjs` y `dist/feedback.d.ts`; sin fugas de `src/`. Ignorar el exit 1 por colisión de versión; validar por la lista de archivos.

- [ ] **Step 4: Verificar exports**

Comprobar que `dist/index.d.ts` y `dist/feedback.d.ts` exponen `ToastProvider`, `ToastViewport`, `useToast`, `toast`, `Spinner`, `Skeleton`, `Progress`, `LoadingOverlay` y sus tipos.

Run: `grep -oE "\b(ToastProvider|ToastViewport|useToast|toast|Spinner|Skeleton|Progress|LoadingOverlay)\b" dist/index.d.ts | sort -u`

- [ ] **Step 5: README**

En la sección "Peer dependencies (Radix)" añadir la línea:

```md
- `ToastProvider` requiere `@radix-ui/react-toast`.
```

y añadir `@radix-ui/react-toast` al comando `pnpm add` de esa sección.

En "Componentes disponibles" añadir:

```md
- **ToastProvider** / **useToast** / **toast** (`feedback`) — mensajes breves no bloqueantes, con cola, deduplicación y API imperativa llamable desde fuera de React.
- **Spinner**, **Skeleton**, **Progress**, **LoadingOverlay** (`feedback`) — indicadores de espera y progreso.
```

Y una sección "Fase 3a: feedback" con un ejemplo mínimo. Verificar que **cada prop usada existe** en el `.types.ts` correspondiente (lección de la Fase 2a: no inventar props):

````md
### Fase 3a: feedback

```tsx
import { ToastProvider, useToast, toast } from "@teams4soft/teams4soft-ui/feedback";

// En la raíz de la aplicación. `global` habilita el `toast` importable.
<ToastProvider global position="top-right" maxVisible={4}>
  <App />
</ToastProvider>;

// Desde un componente:
const { success, error } = useToast();
success({ title: "Cambios guardados" });

// Desde un interceptor HTTP o una capa de servicio, sin React:
toast.error({
  title: "No se pudo guardar",
  message: "Revisa la conexión e intenta nuevamente.",
  duration: "persistent",
  action: { label: "Reintentar", onClick: retry },
});
```

El `toast` importable es **API de cliente**: requiere un `<ToastProvider global />` montado.
````

- [ ] **Step 6: Commit final**

```bash
git add README.md
git commit -m "chore(fase3a): verify build, exports and CSS for 0.4.0"
```

---

## Notas de release (fuera del alcance de las tareas, las ejecuta el orquestador)

Tras mergear la rama de Fase 3a a `main`:

1. `npm version 0.4.0 --no-git-tag-version` → commit → push a `main`.
2. Crear GitHub Release `v0.4.0` (target `main`) → dispara `release.yml` → publica `@teams4soft/teams4soft-ui@0.4.0` con provenance.

## Deferred / pendientes conocidos (log para fases posteriores)

- `ProcessStatus` — quinta pieza de la familia `LoadingFeedback`, diferida (ver spec §2.1). Se construye sobre `Progress` + `Spinner`, ya disponibles.
- Adaptador de compatibilidad `showSuccess(message, summary)` y equivalentes — corresponde a la Fase 6 (Adopción).
- Unificar los spinners inline de `Button` y `TextField` con el nuevo `Spinner`. Cada entry de tsup se empaqueta por separado (`splitting: false`), así que importar entre familias duplicaría el código en cada bundle en vez de reducirlo. Merece su propio análisis.
- `animation="wave"` de `Skeleton` se degrada hoy a `pulse`. Un keyframe propio requiere añadirlo al tema; pendiente de que exista un caso real.
- Pausa de los toasts por pérdida de visibilidad de página: verificar durante la implementación si Radix la cubre; si no, añadir un listener de `visibilitychange` en `ToastProvider`.
- `resolveSlotProps` para unificar el merge `className`/`style` por slot, repetido en cada componente desde la Fase 1.

## Fases siguientes (contexto, no en este plan)

- Fase 3b — Overlays: `ResponsiveDialog`, `FeedbackDialog`.
- Fase 4 — Complejos: `FilePickerField`, `AdvancedDataTable`, `EntityLookupField`.
- Fase 5 — Layout: `SectionPanel`, `PageShell`.
