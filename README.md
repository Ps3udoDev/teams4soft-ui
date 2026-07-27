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
- `CheckboxField` requiere `@radix-ui/react-checkbox`.
- `RadioGroup` requiere `@radix-ui/react-radio-group`.
- Los componentes con soporte `asChild` (composición vía Slot, p. ej. `Button`) requieren `@radix-ui/react-slot`.

```bash
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group
```

## Componentes disponibles

Importables desde el paquete raíz (`@teams4soft/teams4soft-ui`) o desde los subpaths `@teams4soft/teams4soft-ui/primitives`, `@teams4soft/teams4soft-ui/forms` y `@teams4soft/teams4soft-ui/layout`:

- **Button** (`primitives`) — botón con variantes, tamaños, estado `loading` y soporte `asChild`.
- **Tooltip** / **TooltipProvider** (`primitives`) — tooltip accesible sobre `@radix-ui/react-tooltip`.
- **FormField** (`forms`) — wiring de accesibilidad (label, descripción, error) para controles de formulario.
- **TextField** (`forms`) — campo de texto controlado/no controlado, con soporte de `clear`, password y `loading`, integrado con `FormField`.
- **CheckboxField** (`forms`) — control booleano/indeterminado con label, descripción y error, sobre Radix `Checkbox`.
- **RadioGroup** (`forms`) — selección única de un conjunto de opciones, sobre Radix `RadioGroup`.
- **Fieldset** (`layout`) — agrupación semántica nativa de controles relacionados, sobre `<fieldset>`/`<legend>`.
- **FormGrid** / **FormGrid.Item** (`layout`) — grid responsivo para formularios, construido sobre CSS Grid + Tailwind.

### Fase 2a: ejemplos mínimos

```tsx
import { CheckboxField, FormField, RadioGroup, TextField } from "@teams4soft/teams4soft-ui/forms";
import { Fieldset, FormGrid } from "@teams4soft/teams4soft-ui/layout";

// CheckboxField
<CheckboxField
  label="Acepto los términos"
  checked={accepted}
  onCheckedChange={(next) => setAccepted(next === true)}
/>;

// RadioGroup
<RadioGroup
  label="Plan"
  value={plan}
  onValueChange={setPlan}
  options={[
    { value: "basic", label: "Básico" },
    { value: "pro", label: "Pro" },
  ]}
/>;

// Fieldset (TextField no tiene prop `label`: se etiqueta envolviéndolo en FormField)
<Fieldset legend="Datos de contacto" description="Usamos esto solo para notificarte">
  <FormField label="Email">
    <TextField type="email" />
  </FormField>
</Fieldset>;

// FormGrid
<FormGrid columns={{ base: 1, md: 2 }} gap="md">
  <FormGrid.Item span={{ base: 1, md: 2 }}>
    <FormField label="Nombre completo">
      <TextField />
    </FormField>
  </FormGrid.Item>
  <FormField label="Ciudad">
    <TextField />
  </FormField>
</FormGrid>;
```

## Utilidades

- `cn(...classes)` — combina clases y resuelve conflictos de Tailwind (las últimas ganan).
- `composeEventHandlers(theirs, ours)` — compone handlers respetando `preventDefault`.
- `mergeRefs(...refs)` — combina varias refs en una.

## Estado

En construcción por fases.

## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Subir un tag y crear un GitHub Release → el workflow `release.yml` publica con provenance.
