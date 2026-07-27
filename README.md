# @teams4soft/teams4soft-ui

Librería de componentes UI de Teams4Soft: React + TypeScript, tematizable, accesible y neutra.

## Instalación

```bash
pnpm add @teams4soft/teams4soft-ui
```

Importa los estilos una vez en el punto de entrada de tu app:

```ts
import "@teams4soft/teams4soft-ui/styles.css";
```

## Peer dependencies (Radix)

Algunos componentes usan primitivas de [Radix UI](https://www.radix-ui.com/) como peer dependencies — no se instalan automáticamente, tu proyecto debe declararlas:

- `Tooltip` requiere `@radix-ui/react-tooltip`.
- Los componentes con soporte `asChild` (composición vía Slot, p. ej. `Button`) requieren `@radix-ui/react-slot`.

```bash
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip
```

## Componentes disponibles

Importables desde el paquete raíz (`@teams4soft/teams4soft-ui`) o desde los subpaths `@teams4soft/teams4soft-ui/primitives` y `@teams4soft/teams4soft-ui/forms`:

- **Button** (`primitives`) — botón con variantes, tamaños, estado `loading` y soporte `asChild`.
- **Tooltip** / **TooltipProvider** (`primitives`) — tooltip accesible sobre `@radix-ui/react-tooltip`.
- **FormField** (`forms`) — wiring de accesibilidad (label, descripción, error) para controles de formulario.
- **TextField** (`forms`) — campo de texto controlado/no controlado, con soporte de `clear`, password y `loading`, integrado con `FormField`.

## Utilidades

- `cn(...classes)` — combina clases y resuelve conflictos de Tailwind (las últimas ganan).
- `composeEventHandlers(theirs, ours)` — compone handlers respetando `preventDefault`.
- `mergeRefs(...refs)` — combina varias refs en una.

## Estado

En construcción por fases.

## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Subir un tag y crear un GitHub Release → el workflow `release.yml` publica con provenance.
