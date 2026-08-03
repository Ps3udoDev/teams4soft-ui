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
- `DateField` y `SearchableSelectField` requieren `@radix-ui/react-popover`.
- Los componentes con soporte `asChild` (composición vía Slot, p. ej. `Button`) requieren `@radix-ui/react-slot`.
- `ToastProvider` requiere `@radix-ui/react-toast`.

```bash
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-toast
```

## Componentes disponibles

Importables desde el paquete raíz (`@teams4soft/teams4soft-ui`) o desde los subpaths `@teams4soft/teams4soft-ui/primitives`, `@teams4soft/teams4soft-ui/forms`, `@teams4soft/teams4soft-ui/layout` y `@teams4soft/teams4soft-ui/feedback`:

- **Button** (`primitives`) — botón con variantes, tamaños, estado `loading` y soporte `asChild`.
- **Tooltip** / **TooltipProvider** (`primitives`) — tooltip accesible sobre `@radix-ui/react-tooltip`.
- **FormField** (`forms`) — wiring de accesibilidad (label, descripción, error) para controles de formulario.
- **TextField** (`forms`) — campo de texto controlado/no controlado, con soporte de `clear`, password y `loading`, integrado con `FormField`.
- **CheckboxField** (`forms`) — control booleano/indeterminado con label, descripción y error, sobre Radix `Checkbox`.
- **RadioGroup** (`forms`) — selección única de un conjunto de opciones, sobre Radix `RadioGroup`.
- **DateField** (`forms`) — fecha con escritura directa y calendario accesible; valor ISO `YYYY-MM-DD` sin desplazamiento por zona horaria.
- **SearchableSelectField** (`forms`) — select genérico con texto editable para filtrar colecciones locales (patrón combobox + listbox).
- **Fieldset** (`layout`) — agrupación semántica nativa de controles relacionados, sobre `<fieldset>`/`<legend>`.
- **FormGrid** / **FormGrid.Item** (`layout`) — grid responsivo para formularios, construido sobre CSS Grid + Tailwind.
- **ToastProvider** / **useToast** / **toast** (`feedback`) — mensajes breves no bloqueantes, con cola, deduplicación y API imperativa llamable desde fuera de React.
- **Spinner**, **Skeleton**, **Progress**, **LoadingOverlay** (`feedback`) — indicadores de espera y progreso.

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

### Fase 2b: campos avanzados

```tsx
import {
  DateField,
  SearchableSelectField,
  type DateFieldValue,
} from "@teams4soft/teams4soft-ui/forms";

// DateField — el valor público es siempre la cadena ISO "YYYY-MM-DD" o null.
const [startDate, setStartDate] = useState<DateFieldValue>("2026-07-27");

<DateField
  name="startDate"
  label="Desde"
  value={startDate}
  onValueChange={setStartDate}
  locale="es-EC"
  min="2020-01-01"
  max="2030-12-31"
  required
  clearable
/>;

// SearchableSelectField — genérico, con accesores tipados.
type Currency = { code: string; name: string; aliases: string[] };

<SearchableSelectField<Currency, string>
  name="currency"
  label="Moneda"
  options={currencies}
  value={currencyCode}
  onValueChange={(code) => setCurrencyCode(code)}
  getOptionValue={(option) => option.code}
  getOptionLabel={(option) => `${option.code} — ${option.name}`}
  getOptionKeywords={(option) => option.aliases}
  clearable
/>;
```

`DateField` nunca borra una entrada irresoluble: conserva el texto con `aria-invalid` y un mensaje.
`SearchableSelectField` no selecciona nada implícitamente (`autoSelectFirst` es `false` por defecto) y nunca muta `options`.

Adaptadores exportados para interoperar con `Date`:

```tsx
import {
  toDateFieldValue,
  fromDateFieldValue,
  formatDateFieldValue,
} from "@teams4soft/teams4soft-ui/forms";

toDateFieldValue(new Date());              // "2026-08-02"
fromDateFieldValue("2026-07-27");          // Date a medianoche LOCAL
formatDateFieldValue("2026-07-27", "es-EC"); // "27 de julio de 2026"
```

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

## Utilidades

- `cn(...classes)` — combina clases y resuelve conflictos de Tailwind (las últimas ganan).
- `composeEventHandlers(theirs, ours)` — compone handlers respetando `preventDefault`.
- `mergeRefs(...refs)` — combina varias refs en una.

## Estado

En construcción por fases.

## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Subir un tag y crear un GitHub Release → el workflow `release.yml` publica con provenance.
