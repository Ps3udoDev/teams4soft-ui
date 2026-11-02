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

## Peer dependencies

La librería se apoya en [Radix UI](https://www.radix-ui.com/) para overlays y controles, en TanStack Table para `DataGrid` y en componentes propios. Los rangos usan `^` sobre la mayor probada: React `^18.3.0 || ^19.0.0` y `@tanstack/react-table` `^9.3.1`; los mínimos de Radix están en `peerDependencies` de `package.json`. Una nueva mayor se admite solo después de probarla en CI.

Algunos componentes usan primitivas de Radix como peer dependencies — tu proyecto debe declararlas:

- `Tooltip` requiere `@radix-ui/react-tooltip`.
- `CheckboxField` requiere `@radix-ui/react-checkbox`.
- `RadioGroup` requiere `@radix-ui/react-radio-group`.
- `DateField` y `SearchableSelectField` requieren `@radix-ui/react-popover`.
- Los componentes con soporte `asChild` (composición vía Slot, p. ej. `Button`) requieren `@radix-ui/react-slot`.
- `ToastProvider` requiere `@radix-ui/react-toast`.
- `Dialog` y `FeedbackDialog` requieren `@radix-ui/react-dialog`.

```bash
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-toast @radix-ui/react-dialog
```

## Componentes disponibles

Importables desde el paquete raíz (`@teams4soft/teams4soft-ui`) o desde los subpaths `@teams4soft/teams4soft-ui/primitives`, `@teams4soft/teams4soft-ui/forms`, `@teams4soft/teams4soft-ui/layout`, `@teams4soft/teams4soft-ui/feedback`, `@teams4soft/teams4soft-ui/data-display` y `@teams4soft/teams4soft-ui/overlays`:

- **DataGrid** (`data-display`) — tabla de consulta con filtros, orden, paginación, selección y columnas configurables.
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

### Fase 4: DataGrid

`DataGrid` vive en el subpath `./data-display`. En npm, `next` apunta a
`0.5.0-beta.2`, que todavía usa la fila de filtros; el menú de filtros descrito aquí
llega con la próxima beta. Instala también `@tanstack/react-table@9` (la v8 no es
compatible) y los peers Radix de Popover, Checkbox, Slot y Tooltip.

```tsx
import { DataGrid, textColumn, amountColumn, dateColumn } from "@teams4soft/teams4soft-ui/data-display";
import type { DataGridColumn } from "@teams4soft/teams4soft-ui/data-display";

type Premium = { id: string; policy: string; amount: number; dueDate: string };
// Define las columnas fuera del render o con useMemo.
const columns: DataGridColumn<Premium>[] = [
  textColumn<Premium>("policy", "Póliza"),
  amountColumn<Premium>("amount", "Imp. cobrado"),
  dateColumn<Premium>("dueDate", "Vencimiento"),
];

<DataGrid columns={columns} value={rows} getRowId={(row) => row.id}
  selectionMode="multiple" pagination={{ pageSize: 10, pageSizeOptions: [10, 25, 50] }} />;
```

Ofrece orden, filtros por columna, selección por id, columnas fijas y redimensionables,
y visibilidad opcionalmente persistida con `persistKey`.

Cada encabezado filtrable lleva un icono que abre un menú con condición y valor. El filtro
se aplica con "Aplicar" o Enter; Escape o un clic fuera descartan lo escrito. Los textos
ignoran tildes y ocultar una columna limpia su filtro.

| Tipo de filtro | Condiciones |
| --- | --- |
| Texto | Contiene, no contiene, empieza con, termina en, igual a, distinto de |
| Número | Igual a, distinto de, mayor que, mayor o igual que, menor que, menor o igual que |
| Fecha | Igual a, distinto de, antes de, después de |
| Select | Igual a |

`filterOperators` limita las condiciones de una columna: la primera es la inicial y, con
una sola, se oculta el selector. Cada columna admite un filtro a la vez, sin reglas AND/OR.

El orden sigue las reglas del español, usa la etiqueta en `select`/`radio` y deja las
celdas vacías al final.
`pagination={false}` muestra todas las filas. `selection` y
`columnVisibility` permiten controlar esos estados desde la página; `ref.getData()`
devuelve las filas originales y los ids seleccionados, incluso si el filtro los oculta.

`loading` muestra cinco filas skeleton en la primera carga y una capa que bloquea
la interacción cuando ya hay datos. `density="compact"`, `maxHeight`, los tokens
`--ui-grid-*` y los slots de `classNames`/`styles` permiten adaptar la presentación.
`messages` sobrescribe los textos en español y `cellTypes` registra celdas propias.
Las consultas al servidor (`serverSide`) llegan en G3.

#### DataGrid editable

Una columna con `editable: true` (o `editable: (row) => boolean`) edita su celda en el sitio;
`readOnly` en la grilla fuerza consulta. Tipos editables: `text`, `number`, `currency`,
`percent`, `date`, `select`, `checkbox`, `radio` y `custom` (con `cellTypes`).

```tsx
const ref = React.useRef<DataGridHandle<Premium>>(null);
const columns: DataGridColumn<Premium>[] = [
  textColumn<Premium>("policy", "Póliza", { editable: true, required: true }),
  amountColumn<Premium>("amount", "Cobrado", {
    editable: true,
    validate: (value) => (typeof value === "number" && value < 0 ? "No puede ser negativo" : null),
  }),
];

<DataGrid ref={ref} columns={columns} defaultValue={rows} getRowId={(row) => row.id} />;

// Al aceptar:
if (ref.current?.validate()) save(ref.current.getData());
```

`ref.getData()` devuelve el JSON completo de la edición:

```ts
{
  rows: T[];          // filas actuales (originales, editadas y añadidas)
  selectedIds: string[];
  dirtyIds: string[]; // modificadas
  addedIds: string[];
  removedIds: string[];
  errors: Record<rowId, Record<field, string>>;
  isValid: boolean;
}
```

El handle ofrece además `reset(rows)`, `patchRow(id, partial)`, `addRow(row?)`, `removeRow(id)`,
`validate()` (pinta los errores de todas las celdas y devuelve `isValid`) y `focusCell(id, field)`.
`onChange(data, change)` se dispara con cada edición; `column.onCommit({ row, value, prev, grid })`
permite recalcular otras celdas con `grid.patchRow`. `onAddRow` muestra el botón de la barra y es
quien crea la fila.

- **Modo controlado.** El primer `value` no vacío, mientras la grilla está intacta y vacía, se adopta como
  base: una carga asíncrona empieza con el diff vacío. Para recargas posteriores usa `ref.reset(rows)`.
  Un arreglo antiguo que la grilla ya emitió se ignora; para revertir, usa `ref.reset(rows)`. Un padre
  que ignora `onChange` conserva la edición hasta que `value` cambie de identidad.
- **Estabilidad.** `columns` y `cellTypes` deben ser estables (constante de módulo o `useMemo`); si no,
  se re-renderizan todas las filas.
- **Teclado.** Enter confirma y baja; en una celda inválida, Enter se queda. Tab confirma y avanza, y
  puede salir de una celda inválida. Escape descarta el borrador.
- **Dentro de un `Dialog`.** El primer Escape revierte un borrador pendiente y el segundo cierra el diálogo.
- **Negativos.** Los números rechazan negativos por defecto: usa `editorProps: { allowNegative: true }`.

`NumberField` (en `forms`) es el editor numérico: separador de miles mientras se escribe, valor público
`number | null` y `onCommit` al salir o con Enter.

```tsx
import { NumberField } from "@teams4soft/teams4soft-ui/forms";

<NumberField mode="currency" value={amount} onValueChange={setAmount} aria-label="Importe" />;
```

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

El cuerpo de `Dialog` trae padding; para contenido a todo el ancho, como un `DataGrid`, usa `classNames={{ body: "p-0" }}`. Cerrar con clic fuera es opcional: actívalo con `closeOnOverlayClick`.

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

Cambios aditivos que no alteran los defaults existentes.

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

En construcción por fases. Publicadas en npm: **0.4.0** (`latest`) y **0.5.0-beta.2** (`next`).

La `0.5.0` se cierra con G2, G3, `EntityLookupField` + `EntityLookupGroup` y G4. Hasta entonces no salen betas intermedias: habrá una sola para probar todo en el frontend y, después, la versión final.

**Sin publicar:** G2 — edición de `DataGrid` (celdas editables, validación, `getData()`, `onChange`, handle imperativo) y el nuevo `NumberField`. Entra en la `0.5.0` sin versión propia.

| Versión | Fase | Contenido |
| --- | --- | --- |
| 0.5.0-beta.4 (sin publicar) | G1 — Menú de filtros | Cada encabezado filtrable lleva un icono que abre un menú con condición y valor; reemplaza la fila de filtros. Nuevas `filterOperators`, `messages.filter*` y slots `filterButton` y `filterMenu`. Se eliminan los slots `filterRow` y `filterCell` y el token `--ui-grid-filter-height`. |
| 0.5.0-beta.3 (sin publicar) | Correcciones | El cuerpo de `Dialog` trae padding por defecto (`classNames={{ body: "p-0" }}` lo quita) y su pie alinea a la derecha. `RadioGroup` alinea sus opciones al inicio. `FeedbackDialog` avisa en desarrollo si `rejectLabel` llega sin `showReject`. |
| 0.5.0-beta.2 | G1 — TanStack v9 | Migra `DataGrid` a `@tanstack/react-table@^9.3.1`, con la API nativa de esa mayor. La API pública de `DataGrid` no cambia; el peer pasa de la v8 a la v9. |
| 0.5.0-beta.1 | G1 — Corrección | Limita el peer a `@tanstack/react-table@^8.21.3`: con `0.5.0-beta.0`, una instalación limpia resolvía la v9 y el paquete no cargaba. Todos los peers pasan de `>=` a `^`, con Radix y React actualizados; sube los mínimos de Radix. |
| 0.5.0-beta.0 | G1 — Consulta | `DataGrid`, factorías, filtros, selección, paginación y tokens; subpath `./data-display`. |
| 0.4.0 | 3a — Feedback | `ToastProvider`/`useToast`/`toast`, `Spinner`, `Skeleton`, `Progress`, `LoadingOverlay`; subpath `./feedback`. Corrige la navegación por teclado de `SearchableSelectField` (pasos perdidos y estado `open` obsoleto). |
| 0.3.0 | 2b — Campos avanzados | `DateField`, `SearchableSelectField`. Incluida en 0.4.0 (no se publicó por separado). |
| 0.2.0 | 2a — Controles de formulario | `CheckboxField`, `RadioGroup`, `Fieldset`, `FormGrid`; subpath `./layout`. |
| 0.1.0 | 0–1 — Infraestructura y primitivas | `Button`, `Tooltip`, `FormField`, `TextField`. |

Después de la `0.5.0`: `FilePickerField`, Fase 5 (`SectionPanel`, `PageShell`), los componentes que faltan para reemplazar PrimeReact y Fase 6 (estable `1.0.0`).

## Publicación (mantenedores)

1. Crear `NPM_TOKEN` (token de automatización con 2FA) en la organización `@teams4soft` y guardarlo como secret del repo.
2. Crear un GitHub Release marcado como pre-release para la versión de `package.json` (p. ej. `v0.5.0-beta.1`): el workflow publica con provenance en `next`. Los releases estables usan `latest`.
3. El workflow de release ejecuta `node scripts/verify-clean-install.mjs` con React 18 y 19 y no publica si falla: instala el resultado de `pnpm pack` en un proyecto vacío, sin fijar peers, y comprueba que carga y renderiza en ESM y CJS. Tras publicar, instalar la versión exacta (con `minimumReleaseAge` de pnpm 11, `@next` resuelve a la anterior durante las primeras 24 horas) y probar la página piloto del frontend, incluida su convivencia con el preflight de Tailwind/PrimeReact.
