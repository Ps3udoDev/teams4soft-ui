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
- `Dialog` y `FeedbackDialog` requieren `@radix-ui/react-dialog` (`>=1.1.0`).

```bash
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-toast @radix-ui/react-dialog
```

## Componentes disponibles

Importables desde el paquete raíz (`@teams4soft/teams4soft-ui`) o desde los subpaths `@teams4soft/teams4soft-ui/primitives`, `@teams4soft/teams4soft-ui/forms`, `@teams4soft/teams4soft-ui/layout`, `@teams4soft/teams4soft-ui/feedback` y `@teams4soft/teams4soft-ui/overlays`:

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
- **Dialog**, **FeedbackDialog**, **FeedbackDialogProvider**, **confirm** / **notify** (`overlays`) — modales accesibles y confirmaciones con cola FIFO.

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

### Overlays

Importa `Dialog`, `FeedbackDialog`, `FeedbackDialogProvider`, `confirm` y `notify`
desde el paquete raíz o desde `@teams4soft/teams4soft-ui/overlays`.

```tsx
import { Dialog, FeedbackDialogProvider, confirm, notify } from "@teams4soft/teams4soft-ui/overlays";

// Monta una sola instancia global en la raíz de la aplicación.
<FeedbackDialogProvider global>
  <App />
</FeedbackDialogProvider>;

<Dialog open={open} onOpenChange={setOpen} title="Buscar clientes" size="lg">
  <CustomerSearch />
</Dialog>;

// También desde código de cliente fuera de React.
const accepted = await confirm({
  title: "Eliminar registro",
  message: "¿Desea eliminar el registro seleccionado?",
  severity: "danger",
  showReject: true,
});
if (accepted) await removeRow();
await notify.success("Cambios guardados");
await notify.error("No se pudo guardar", { title: "Error" });
```

`FeedbackDialog` ofrece la confirmación declarativa con `open`, `onOpenChange`,
`message`, `onAccept` y `onReject`. Si `onAccept` devuelve una promesa, Aceptar
muestra carga; si falla, el diálogo permanece abierto para reintentar.
`showReject` es `false` por defecto. `error` es alias de la severidad `danger`.

`confirm` resuelve `true` al aceptar y `false` al cancelar, cerrar con X o pulsar
Escape. `notify` resuelve al cerrar. Las solicitudes esperan en una cola FIFO;
sin un `<FeedbackDialogProvider global />` montado, ambas funciones lanzan un error.
Esta API es de cliente; no debe invocarse durante renderizado en servidor.

`Dialog` mide 400px por defecto; `width` tiene prioridad sobre `size`. En móvil
ocupa la ventana o se presenta como panel inferior con `mobileVariant="sheet"`.
`loading` bloquea el cuerpo. `onHide` y `onOpenChange(false)` se disparan solo
cuando el usuario pide cerrar (X, Escape o clic en la máscara), igual que en
PrimeReact; cerrar desde el padre con `open={false}` no los llama. `onHide` es
inmediato salvo con `hideMode="after-animation"`. Los slots `classNames`/`styles`
y `unstyled` permiten personalizar la presentación.

Los iconos de severidad de `FeedbackDialog` usan los tokens `--ui-info`,
`--ui-warning`, `--ui-success` y `--ui-danger`; sus botones siempre usan
`--ui-primary`.

### Ajustes 0.5.0

Cambios aditivos preparados para la siguiente publicación; la versión del paquete
permanece en 0.4.0 y los defaults existentes se conservan.

- `--ui-control-height` define la altura de `TextField` mediano, `DateField` y
  `SearchableSelectField` (2.5rem por defecto). Puede sobrescribirse en un módulo;
  los tamaños pequeño y grande de `TextField` conservan sus alturas.
- `FormField` admite `orientation="horizontal"` y `labelWidth="10rem"`: etiqueta
  a la izquierda y mensajes debajo del control; bajo `md` vuelve a vertical.
  `requiredIndicator="conditional"` muestra `**` en campos requeridos. `messages`
  permite personalizar los textos `required`, `conditional` y `optional`.
- `DateField` admite `completePartialInput` y `referenceDate="2026-10-30"`:
  `4` y `4/10` se completan como `2026-10-04` con formato `dd/MM/yyyy`.
  Sin referencia explícita usa la fecha local al confirmar. Las fechas imposibles
  siguen siendo inválidas. El comportamiento se activa explícitamente.
- `SearchableSelectField openOnType={false}` permite escribir sin abrir ni filtrar
  el panel y resuelve al salir o pulsar Enter. `selectOnFocus` selecciona el texto
  al recibir foco, sin abrir. Sus defaults siguen siendo `true` y `false`.
- `Fieldset variant="plain"` elimina borde y padding; `as="section"` usa una
  región nombrada por un encabezado. El default sigue siendo un fieldset outlined.
  La deshabilitación nativa de los descendientes pertenece a `as="fieldset"`.
- `LoadingOverlay indicator` sustituye el spinner. `LoadingProvider global` habilita
  `loading.show`, `loading.hide` y `loading.wrap` desde código de cliente.

```tsx
import { LoadingProvider, loading } from "@teams4soft/teams4soft-ui/feedback";

<LoadingProvider global><App /></LoadingProvider>;

// hide se ejecuta también si la promesa falla; se conserva su resultado/error.
const report = await loading.wrap(generateReport(), "Generando reporte…");

loading.show({ message: "Exportando…", indicator: <ExcelIndicator /> });
try {
  await exportReport(report);
} finally {
  loading.hide();
}
```

La carga global usa un contador: dos `show` requieren dos `hide`. La última llamada
`show` establece el mensaje y el indicador; al llegar a cero se limpian ambos.
Si falta un provider global se emite un aviso de desarrollo, como con `toast`.

## Utilidades

- `cn(...classes)` — combina clases y resuelve conflictos de Tailwind (las últimas ganan).
- `composeEventHandlers(theirs, ours)` — compone handlers respetando `preventDefault`.
- `mergeRefs(...refs)` — combina varias refs en una.

## Estado

En construcción por fases. Versión actual: **0.4.0**.

| Versión | Fase | Contenido |
| --- | --- | --- |
| 0.4.0 | 3a — Feedback | `ToastProvider`/`useToast`/`toast`, `Spinner`, `Skeleton`, `Progress`, `LoadingOverlay`; subpath `./feedback`. Corrige la navegación por teclado de `SearchableSelectField` (pasos perdidos y estado `open` obsoleto). |
| 0.3.0 | 2b — Campos avanzados | `DateField`, `SearchableSelectField`. Incluida en 0.4.0 (no se publicó por separado). |
| 0.2.0 | 2a — Controles de formulario | `CheckboxField`, `RadioGroup`, `Fieldset`, `FormGrid`; subpath `./layout`. |
| 0.1.0 | 0–1 — Infraestructura y primitivas | `Button`, `Tooltip`, `FormField`, `TextField`. |

Implementados para la siguiente publicación: `Dialog` y `FeedbackDialog` (`./overlays`). Siguientes: Fase 4 (`FilePickerField`, `AdaptiveDataTable`, `EntityLookupField`), Fase 5 (`SectionPanel`, `PageShell`) y Fase 6 (estable `1.0.0`).

## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Subir un tag y crear un GitHub Release → el workflow `release.yml` publica con provenance.
