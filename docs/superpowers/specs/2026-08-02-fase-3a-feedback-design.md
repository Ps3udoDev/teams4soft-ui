# Diseño: Fase 3a — Feedback no bloqueante (`ToastProvider` + familia `LoadingFeedback`)

> Fecha: 2026-08-02
> Estado: aprobado, pendiente de plan de implementación.
> Alcance: primera mitad de la Fase 3 del plan maestro (`components_docs/migration/00_plan_maestro_ui_library.md` §7).
> Documentos vinculantes: `components_docs/migration/09_toast_provider.md`, `components_docs/migration/10_loading_feedback.md`.
> Release objetivo: `0.4.0`.

## 1. Objetivo

Cubrir el feedback **no bloqueante** de la librería: mensajes breves que no exigen una decisión (`ToastProvider`) y los indicadores de espera y progreso (`Spinner`, `Skeleton`, `LoadingOverlay`, `Progress`).

La evidencia del plan maestro (§2) sitúa las notificaciones globales como el patrón más extendido del proyecto: **473 llamadas en 114 archivos**, prioridad P0. Es el componente de mayor impacto de adopción de toda la migración.

## 2. Por qué se parte la Fase 3

El plan maestro enumera cuatro elementos en la Fase 3, pero uno de ellos, `LoadingFeedback`, es una **familia de cinco componentes**. El volumen real de la fase es de ocho componentes más dos providers — mayor que la Fase 2 completa, que ya se dividió en 2a y 2b con buen resultado.

El corte sigue el orden del propio plan maestro y respeta las dependencias internas:

| Sub-fase | Contenido | Release |
|---|---|---|
| **3a** (este documento) | `ToastProvider` + `Spinner`, `Skeleton`, `LoadingOverlay`, `Progress` | `0.4.0` |
| **3b** (documento aparte) | `ResponsiveDialog` + `FeedbackDialog` | `0.5.0` |

Toast no depende de nada previo. `FeedbackDialog` compone `ResponsiveDialog`, así que ambos viajan juntos en 3b. `ProcessStatus` compone `Progress` + `Spinner`, que quedan listos en 3a.

### 2.1. `ProcessStatus` se difiere

Es la pieza más *product-shaped* de la familia: máquina de estados (`queued`/`running`/`success`/`error`/`cancelled`), acciones de cancelar, descartar y expandir, y una ilustración. Nació de un caso concreto — el loader de exportación a Excel — y es composición de `Progress` + `Spinner` + slots, así que la aplicación puede construirla encima mientras tanto.

Diferirla es aplicar YAGNI a la única pieza del grupo sin consumidor validado dentro de la librería.

## 3. Restricciones heredadas

Todas las reglas transversales del proyecto siguen vigentes y son de cumplimiento obligatorio:

- **Contrato universal de personalización** (plan maestro §4): `className` en la raíz, `classNames` por slot, `unstyled`, `style`, `styles`. Merge con `cn(!unstyled && base, className, classNames?.slot)`. `unstyled` conserva comportamiento y accesibilidad, elimina solo clases visuales.
- **Estados como `data-*`** con presencia condicional (`|| undefined`), más los `data-*` que aporte Radix.
- **Callbacks semánticos.** Sin eventos sintéticos inventados.
- **Tokens semánticos, no colores.** Tailwind v4 con paréntesis para valores CSS-var arbitrarios: `rounded-(--radius-ui-md)`, nunca corchetes.
- **Sin `any` en la API pública.** Sin dependencias de negocio, router ni stores de aplicación.
- **Dev-warnings guardados** tras `typeof process !== "undefined" && process.env.NODE_ENV !== "production"`.
- Documentación en español, nombres de API en inglés.
- Gestor de paquetes **pnpm**; el repo git es la carpeta anidada `teams4soft-ui/teams4soft-ui/`.

## 4. Arquitectura

Familia nueva `src/feedback/` y **subpath nuevo `/feedback`**, coherente con `/primitives`, `/forms` y `/layout`. Implica entry en `tsup.config.ts`, bloque en `exports` de `package.json` y re-export desde `src/index.ts`.

```text
src/feedback/
├── toast/
│   ├── toast-store.ts        ← lógica pura, sin React
│   ├── toast-store.test.ts
│   ├── toast-global.ts       ← store por defecto + `toast` importable
│   ├── Toast.types.ts
│   ├── ToastProvider.tsx     ← Radix Toast.Provider + contexto + useSyncExternalStore
│   ├── ToastViewport.tsx     ← Radix Toast.Viewport + render de la cola
│   ├── useToast.ts
│   ├── Toast.test.tsx
│   └── Toast.stories.tsx
├── spinner/
│   ├── Spinner.tsx · Spinner.types.ts · Spinner.test.tsx · Spinner.stories.tsx
├── skeleton/
├── loading-overlay/
├── progress/
└── index.ts
```

### 4.1. La lógica determinista se extrae y se prueba primero

`toast-store.ts` es a esta fase lo que `date-utils.ts` y `select-utils.ts` fueron a la 2b: cola FIFO, deduplicación, `update`, topes de tamaño y generación de identificadores, todo verificable **sin montar un solo componente**. Es la parte de mayor riesgo y la que más barato sale probar aislada.

### 4.2. Motor del toast: Radix + store externa

Se usa `@radix-ui/react-toast` como motor, según el orden de preferencia del plan maestro (§3.1).

Reparto de responsabilidades:

| Radix aporta | La librería aporta |
|---|---|
| Pausa al hover y al foco | Cola FIFO y `maxVisible` |
| Gesto swipe | Deduplicación por `dedupeKey` |
| Duplicado *announce-only* para lectores de pantalla | `update()` y la API imperativa |
| Rol correcto (`status` frente a `alert`) | Posiciones y tonos |
| `Escape` sobre el toast enfocado | Iconografía por defecto reemplazable |

Se descartaron dos alternativas:

- **Implementación propia completa.** Reimplementar pausa, swipe, anuncio y foco es exactamente donde se rompe la accesibilidad, y contradice §3.1.
- **Envolver `sonner` o `react-hot-toast`.** Introduce una dependencia con estilos propios que compiten con los tokens, hace inviable `unstyled` y `classNames` por slot, y contradice §3.1.

Peer nueva: `@radix-ui/react-toast` (`>=1.2.0`), dev `^1.2.x`. La regex `/^@radix-ui\//` del `external` de tsup ya la cubre; **el build no se toca**.

### 4.3. Requisito global: llamar al toast desde fuera de React

Con 473 llamadas repartidas en 114 archivos, muchas viven en interceptores HTTP y capas de servicio. La API debe ser invocable desde fuera del árbol de React.

La solución es que **la store viva fuera de React** (`createToastStore()` consumida con `useSyncExternalStore`), lo que evita la habitual danza de *bind/unbind* con buffer:

- `<ToastProvider>` → store privada. Varias instancias no se pisan: Storybook y la suite de pruebas quedan aisladas.
- `<ToastProvider global>` → usa la store por defecto del módulo, la misma que expone el `toast` importable.

```ts
import { toast } from "@teams4soft/teams4soft-ui/feedback";

toast.error({ title: "Sesión expirada" });
```

Como la store existe desde la carga del módulo, una llamada anterior al montaje queda encolada en el estado y se pinta al montar el provider. Los temporizadores no corren hasta que Radix renderiza el toast, así que **ningún mensaje expira sin haberse mostrado**.

`global` es **opt-in** (default `false`). Una sola línea en la raíz de la aplicación, a cambio de que Storybook y las pruebas no compartan estado accidentalmente.

#### Riesgos asumidos y su mitigación

| Riesgo | Mitigación |
|---|---|
| **SSR:** una store a nivel de módulo compartida entre peticiones filtraría estado entre usuarios | La store global solo se escribe desde cliente; el `toast` importable se documenta como **API client-only**; el provider `global` limpia la store al desmontarse |
| **Acumulación sin provider:** la cola crecería sin límite si nadie monta el provider | Tope `maxQueued` (default 50) que descarta lo más antiguo con dev-warning |
| **Copias múltiples del módulo:** `tsup` construye cinco entries con `splitting: false`, así que una store a nivel de módulo se duplica en cada bundle — mezclar un import de la raíz con uno de `/feedback` daría al provider y al `toast` dos singletons distintos, y nada se renderizaría | La store y el flag de reclamación viven en `globalThis` bajo `Symbol.for("@teams4soft/teams4soft-ui.toast")`, así que la primera copia que cargue crea el estado y el resto lo reutiliza. Cubre además el caso de dos copias del paquete instaladas en el árbol del consumidor |
| **Dos providers reclamando `global`** | Dev-warning explícito; gana el primero montado |

## 5. Desviaciones respecto a los documentos de origen

Dos, deliberadas:

1. **El viewport se monta solo.** El doc 09 muestra `<ToastProvider><App/><ToastViewport/></ToastProvider>`. Aquí `ToastProvider` renderiza el viewport por sí mismo (`renderViewport`, default `true`) y `ToastViewport` se exporta solo como escape hatch para colocaciones exóticas. Con 473 llamadas que migrar, un paso menos que olvidar.
2. **Se completa el contrato de personalización.** El doc 10 omite `style`/`styles` en `Spinner`, `Skeleton` y `Progress`, y deja `classNames` incompleto en `Progress`. Se completan: la §4 del plan maestro es innegociable para todo componente público.

## 6. Contratos públicos

### 6.1. Toast

```ts
export type ToastTone = "success" | "error" | "warning" | "info" | "neutral";

export type ToastPosition =
  | "top-left" | "top-center" | "top-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

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
  tone?: ToastTone;                      // default "neutral"
  duration?: number | "persistent";      // default: `defaultDuration` del provider
  /** Reemplaza el icono del tono solo en este toast. */
  icon?: React.ReactNode;
  action?: ToastAction;
  /** Muestra el botón de cierre. Default `true`. */
  dismissible?: boolean;
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

export interface ToastClassNames {
  viewport: string;
  root: string;
  icon: string;
  content: string;
  title: string;
  message: string;
  action: string;
  closeButton: string;
}

export interface ToastProviderProps {
  children?: React.ReactNode;
  position?: ToastPosition;              // default "top-right"
  maxVisible?: number;                   // default 4
  defaultDuration?: number;              // default 4000
  maxQueued?: number;                    // default 50
  /** Conecta este provider a la store del módulo, habilitando el `toast` importable. */
  global?: boolean;                      // default false
  /** Reemplaza globalmente la iconografía por tono. */
  icons?: Partial<Record<ToastTone, React.ReactNode>>;
  renderViewport?: boolean;              // default true
  className?: string;
  classNames?: Partial<ToastClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ToastClassNames, React.CSSProperties>>;
}
```

Dos superficies, una sola store: `useToast()` (contexto, siempre disponible) y `toast` (módulo, requiere un provider con `global`). `show()` genera el identificador en la store, así que **devuelve un `string` válido de forma síncrona** aunque todavía no haya provider montado.

`maxVisible` y `maxQueued` no son lo mismo y conviene no confundirlos: `maxVisible` limita cuántos toasts se **renderizan a la vez** — el resto espera su turno en la cola, sin perderse; `maxQueued` limita cuántos **caben en la store en total** y es una red de seguridad contra el crecimiento sin límite, no un mecanismo de presentación.

`dismissAll()` cierra tanto los visibles como los que aún esperan en cola.

### 6.2. Familia loading

```ts
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "xs" | "sm" | "md" | "lg";      // default "md"
  /** Nombre accesible cuando el spinner comunica carga. */
  label?: string;
  /** Marca el spinner como puramente decorativo (`aria-hidden`). */
  decorative?: boolean;
  className?: string;
  unstyled?: boolean;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "text" | "rect" | "circle";    // default "text"
  width?: string | number;
  height?: string | number;
  lines?: number;                        // solo para shape "text"
  animation?: "pulse" | "wave" | "none"; // default "pulse"
  className?: string;
  unstyled?: boolean;
}

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
  /** Captura el puntero sobre el área cubierta. Ver §7.4. */
  blocking?: boolean;
  target?: "viewport" | "container";     // default "container"
  className?: string;
  classNames?: Partial<LoadingOverlayClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof LoadingOverlayClassNames, React.CSSProperties>>;
}

export interface ProgressClassNames {
  root: string;
  track: string;
  indicator: string;
  label: string;
  value: string;
}

export interface ProgressProps {
  /** Ausente = progreso indeterminado. */
  value?: number;
  max?: number;                          // default 100
  label?: React.ReactNode;
  /** Muestra el porcentaje redondeado (`value / max`). Se ignora si es indeterminado. */
  showValue?: boolean;
  tone?: "primary" | "success" | "warning" | "danger";  // default "primary"
  size?: "sm" | "md" | "lg";             // default "md"
  className?: string;
  classNames?: Partial<ProgressClassNames>;
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof ProgressClassNames, React.CSSProperties>>;
}
```

## 7. Comportamiento

### 7.1. Ciclo de vida de un toast

Cada entrada de la store tiene estado `"open" | "closing"`. `dismiss()` marca `closing`, el viewport renderiza `open={status === "open"}` y la eliminación real ocurre al terminar la transición de salida, **con un `timeout` de respaldo**.

Ese respaldo no es opcional: en un entorno sin animaciones — `prefers-reduced-motion`, o jsdom durante las pruebas — el evento de fin de transición nunca llega y la cola acumularía entradas zombis indefinidamente.

### 7.2. Semánticas que los documentos de origen no fijan

| Caso | Decisión |
|---|---|
| `show()` con un `id` que ya existe | Actualiza en sitio y reinicia el temporizador. No duplica. |
| `dedupeKey` con coincidencia viva | Refresca el existente y devuelve su id. No crea uno nuevo. |
| `update()` sobre un id ya cerrado | No-op con dev-warning. |
| `duration: "persistent"` | Se traduce a un **entero finito grande** (`2_147_483_647`), nunca `Infinity`. |
| `action.onClick` lanza una excepción | Se captura; la cola no se bloquea. |
| `maxQueued` excedido | Descarta la entrada más antigua con dev-warning. |

La regla de `Infinity` merece énfasis: `setTimeout` coacciona su argumento a int32, así que `Infinity` colapsa a `0` y un toast declarado "persistente" se cerraría de inmediato. Es un fallo que atraviesa una revisión sin que nadie lo note.

### 7.3. Pausa por visibilidad de página

Radix cubre la pausa al hover y al foco. La pausa por **pérdida de visibilidad de página** que exige el doc 09 es un **punto a verificar durante la implementación**, no a asumir: si Radix no la cubre, se añade un listener de `visibilitychange` en el provider que pause los temporizadores.

### 7.4. Limitación conocida de `LoadingOverlay`

`blocking` captura el puntero sobre el área cubierta y marca `aria-busy`, pero **no puede inertizar el fondo**. Un componente renderizado *dentro* del contenedor no puede aplicar `inert` a sus hermanos sin clonarlos, así que un usuario de teclado podrá seguir tabulando por detrás del overlay.

Mitigación documentada: el consumidor deshabilita los controles del área afectada. Si un caso exige bloqueo real de la interacción, ese caso es un diálogo modal, no un overlay — y llega en la Fase 3b.

`target="container"` exige que el padre esté posicionado (`relative`). Se documenta en el JSDoc, se cubre con una historia y se comprueba en desarrollo con un dev-warning que inspecciona el `position` calculado del padre.

## 8. Accesibilidad

- **El tono nunca depende solo del color.** Cada tono aporta icono por defecto (`aria-hidden`) más un prefijo oculto accesible — "Error:", "Éxito:" — y `data-tone` para estilar.
- `error` se anuncia en región asertiva (`Toast.Root type="foreground"`); el resto, en región cortés.
- **El foco no se mueve automáticamente** al aparecer un toast.
- El botón de cierre tiene nombre accesible; `Escape` cierra el toast enfocado.
- La acción del toast expone `altText` para lectores de pantalla.
- `Spinner`: `label` produce nombre accesible; `decorative` aplica `aria-hidden`. Son mutuamente excluyentes.
- `Skeleton` es siempre decorativo; quien anuncia la carga es el contenedor, vía `aria-busy`.
- `Progress` usa `role="progressbar"` con `aria-valuemin`/`aria-valuemax`/`aria-valuenow`. En modo indeterminado **se omite `aria-valuenow`**, que es lo que marca ARIA.
- Todas las animaciones respetan `prefers-reduced-motion`.

## 9. Dev-warnings

Con la guarda habitual del repo:

- usar el `toast` importable sin un provider `global` montado;
- un segundo provider reclamando `global`;
- `update()` sobre un id inexistente;
- `maxQueued` excedido;
- `Spinner` con `label` y `decorative` a la vez;
- `LoadingOverlay` con `target="container"` cuyo padre no está posicionado.

## 10. Pruebas

**Store, sin montar React:** orden FIFO; `maxVisible`; dedupe que refresca en lugar de duplicar; merge de `update`; `dismiss` y `dismissAll`; descarte por `maxQueued`; unicidad de identificadores; `persistent` no programa expiración.

**Provider:** `useToast()` pinta el toast; `global` conecta el `toast` de módulo; **sin `global` NO lo conecta** — esta prueba negativa es la que protege el aislamiento en Storybook y en la suite; desmontar limpia la store global.

**Accesibilidad:** `error` en región asertiva y el resto en cortés; nombre accesible del cierre; `altText` de la acción; el foco no se mueve.

**Loading:** `clamp` de `Progress` a `[0, max]`; indeterminado sin `aria-valuenow`; `Spinner` con `label` frente a `decorative`; `Skeleton` decorativo con `lines`; `aria-busy` y captura de puntero en `LoadingOverlay`.

## 11. Historias

**Toast:** `Tones`, `WithAction`, `Persistent`, `Queue`, `Deduplication`, `Update`, `Positions`, `CustomClasses`, `Unstyled`, `Keyboard`, `Mobile`.

**Loading:** `SpinnerSizes`, `SkeletonShapes`, `OverlayContainer`, `OverlayViewport`, `ProgressDeterminate`, `ProgressIndeterminate`, `CustomClasses`, `Unstyled`, `ReducedMotion`.

## 12. Definición de terminado

- `pnpm typecheck` sin errores.
- `pnpm test` con la suite completa en verde (fases 1, 2a, 2b y 3a).
- `pnpm build` produce ESM + CJS + dts + CSS.
- Las clases nuevas llegan a `dist/styles.css`.
- `pnpm publish --dry-run --no-git-checks` sin fugas de `src/`. Nota: el dry-run puede terminar con exit 1 por colisión con la versión ya publicada; eso no es un defecto de empaquetado — se valida por la lista de archivos.
- `/feedback` exporta desde la raíz y desde el subpath; verificado en `dist/index.d.ts` y `dist/feedback.d.ts`.

## 13. Fuera de alcance

Explícito, para que no se cuele durante la implementación:

- `ProcessStatus` (diferido, ver §2.1).
- `ResponsiveDialog` y `FeedbackDialog` (Fase 3b).
- El adaptador de compatibilidad `showSuccess(message, summary)` y equivalentes, que menciona la nota de migración del doc 09. Corresponde a la Fase 6 — Adopción.
- Unificar los spinners inline de `Button` y `TextField` con el nuevo `Spinner`. Cada entry de tsup se empaqueta por separado (`splitting: false`), así que importar `feedback/spinner` desde `primitives/button` **duplicaría** el código en cada bundle en vez de reducirlo. Merece su propio análisis; queda como follow-up.
- Virtualización o límite de toasts simultáneos más allá de `maxVisible` y `maxQueued`.

## 14. Notas de release

Tras mergear la rama de Fase 3a a `main`:

1. `npm version 0.4.0 --no-git-tag-version` → commit → push a `main`.
2. Crear GitHub Release `v0.4.0` (target `main`), que dispara `release.yml`.
