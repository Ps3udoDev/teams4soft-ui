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

### Probar la beta

Instala la versión exacta, no `@next`: con `minimumReleaseAge` de pnpm 11, `@next` resuelve a la versión anterior durante las primeras 24 horas desde la publicación.

```bash
pnpm add @teams4soft/teams4soft-ui@0.5.0-beta.5
```

Para migrar desde PrimeReact sigue la [guía de migración de `DataGrid`](docs/migration/data-grid.md): tabla de equivalencias, diferencias conocidas, `NumberField`, `EntityLookupField` y el tema Siniestros.

## Peer dependencies

La librería se apoya en [Radix UI](https://www.radix-ui.com/) para overlays y controles, en TanStack Table para `DataGrid` y en componentes propios. Los rangos usan `^` sobre la mayor probada: React `^18.3.0 || ^19.0.0`; los mínimos de Radix están en `peerDependencies` de `package.json`. Una nueva mayor se admite solo después de probarla en CI. TanStack Table no es peer: la librería lo trae como dependencia con la versión exacta `9.3.1`, así que no hay que instalarlo, y un `@tanstack/react-table` v8 en tu proyecto convive sin conflicto.

**Node:** se requiere `^20.19.0 || >=22.12.0`. Con `require`, los subpaths `primitives`, `forms`, `layout`, `feedback` y `overlays` cargan sin más. La raíz y `/data-display` dependen de TanStack v9, que es solo ESM, y se cargan por `require` gracias al soporte de `require(esm)` de esas versiones de Node. Si los cargas por `require` en un runner con su propio cargador, como Jest, pruébalo antes o usa ESM (no probado).

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
- **EntityLookupField** / **EntityLookupGroup** (`data-display`) — buscadores de catálogo (local o remoto) con modal de resultados, de uno o varios campos.
- **Button** (`primitives`) — botón con variantes, tamaños, estado `loading` y soporte `asChild`.
- **Tooltip** / **TooltipProvider** (`primitives`) — tooltip accesible sobre `@radix-ui/react-tooltip`.
- **FormField** (`forms`) — wiring de accesibilidad (label, descripción, error) para controles de formulario.
- **TextField** (`forms`) — campo de texto controlado/no controlado, con soporte de `clear` (`clearLabel` personaliza el nombre accesible del botón), password y `loading`, integrado con `FormField`.
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

`DataGrid` vive en el subpath `./data-display`. En npm, `next` apunta todavía a
`0.5.0-beta.2`, que usa la fila de filtros; el menú de filtros descrito aquí llega con
`0.5.0-beta.5`. TanStack Table viene incluido; solo instala los peers Radix de
Popover, Checkbox, Slot y Tooltip. Si vienes de PrimeReact, empieza por la
[guía de migración](docs/migration/data-grid.md).

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
devuelve las filas actuales y los ids seleccionados, incluso si el filtro los oculta.

`loading` muestra cinco filas skeleton en la primera carga y una capa que bloquea
la interacción cuando ya hay datos; al terminar, el foco vuelve al control que lo tenía (o, en la última página, al paginador). `density="compact"`, `maxHeight`, los tokens
`--ui-grid-*` y los slots de `classNames`/`styles` permiten adaptar la presentación.
`messages` sobrescribe los textos en español y `cellTypes` registra celdas propias.
Las opciones remotas (`loadOptions`) y las consultas al servidor (`serverSide`) se describen abajo.

#### Opciones remotas y consultas al servidor

**`loadOptions` en columnas `select`.** Una columna `select` puede traer sus opciones de un servicio con
`loadOptions(query)`, que recibe el texto buscado (`""` para el catálogo completo) y devuelve las opciones:

```tsx
const columns = React.useMemo<DataGridColumn<Policy>[]>(() => [
  {
    field: "insurerId", header: "Aseguradora", type: "select", editable: true,
    loadOptions: (query) => api.searchInsurers(query), // Promise<{ value, label }[]>
  },
], []);
```

- **Caché por columna.** Cada instancia guarda el resultado de cada consulta (campo y texto recortado): la celda de
  lectura, el editor y el menú de filtro la comparten, y una consulta repetida no vuelve a llamar al servicio.
- **Una vez por consulta.** Al montar se carga `""` una sola vez por columna visible (una oculta lo hace al mostrarse)
  para resolver las etiquetas de todas las filas; mientras llega se ve el valor sin etiquetar. Escribir en el editor
  busca una vez, 250 ms después de la última tecla; elegir una opción no dispara otra búsqueda con su etiqueta.
- **Reintento.** Un rechazo no se guarda en la caché. El editor y el menú de filtro marcan el error (borde rojo y el
  mensaje `messages.loadOptionsError`, también en lugar de "Sin resultados" en la lista). Reabrir el selector reintenta
  el catálogo y volver a escribir reintenta la búsqueda.
- **La identidad no invalida.** Cambiar la función `loadOptions` entre renders no vacía la caché y siempre se llama a
  la última. Para recargar un catálogo que depende de otro dato, vuelve a montar el grid con `key`.
- **Con `options` presentes**, estas dan las etiquetas de lectura y no se carga `""` para leer; al abrir el editor o el
  menú de filtro sí se carga, y el editor sigue buscando en remoto.

**`serverSide`: paginar, ordenar y filtrar en el servidor.** La grilla no toca las filas de `value` (exige `value`,
que debe ser la página actual) y pide cada consulta a quien la use:

```tsx
const [page, setPage] = React.useState({ rows: [] as Premium[], total: 0 });
const [loading, setLoading] = React.useState(true);
const latest = React.useRef(0);
const onQueryChange = React.useCallback((query: DataGridQuery) => {
  const request = ++latest.current;
  setLoading(true);
  api.premiums(query).then((result) => {
    if (request !== latest.current) return; // descarta respuestas viejas
    setPage(result);
  }).catch(() => {
    // Informa del error donde corresponda; sin el finally la grilla quedaría inerte.
  }).finally(() => {
    if (request === latest.current) setLoading(false);
  });
}, []);
const serverSide = React.useMemo(() => ({ totalRecords: page.total, onQueryChange }), [page.total, onQueryChange]);

<DataGrid columns={columns} value={page.rows} getRowId={(row) => row.id} loading={loading} serverSide={serverSide} />;
```

```ts
type DataGridQuery = {
  pageIndex: number; // desde 0
  pageSize: number;
  sorting: Array<{ field: string; desc: boolean }>;
  filters: Record<string, { operator: DataGridFilterOperator; value: unknown }>;
};
```

- **Una consulta por cambio.** `onQueryChange` se llama al montar y cuando cambian página, tamaño, orden o filtros. Un
  cambio de orden, filtro o tamaño de página vuelve a `pageIndex: 0` en esa misma llamada. Escribir en el menú de
  filtro sin aplicar no consulta; "Aplicar", "Limpiar" u ocultar una columna filtrada sí. Un `onQueryChange` nuevo no
  repite la consulta: se llama siempre al último.
- **`totalRecords`** fija el número de páginas y el total del rango ("Mostrando 1 al 10 de 500 registros"). Descartar
  las respuestas que llegan tarde corresponde a quien consulta, como en el ejemplo.
- **`loading`** pone la capa de carga sobre las filas actuales; solo la primera carga, sin filas, usa skeleton.
- **Diff.** Un `value` externo con otro conjunto de ids (otra página, resultados filtrados) es la base nueva y no emite
  `onChange`: las ediciones sin guardar salen del diff, y `dirtyIds`, `addedIds` y `removedIds` describen solo la página
  actual. Un refresco con las mismas filas (mismo conjunto de ids, aunque cambie el orden o los valores) conserva la base y
  recalcula el diff contra el `value` nuevo: gana `value`. Un valor del servidor reemplaza una edición ya confirmada
  (las ediciones sin guardar sobreviven solo si el padre las fusiona) y una fila intacta que cambió fuera aparece como
  modificada hasta `ref.reset(rows)`. Los borradores y el foco se conservan.
- **Filas añadidas y quitadas.** Con `serverSide`, añade con `ref.addRow(row)` y quita con `ref.removeRow(id)`: cambiar
  el conjunto de ids por `value` adopta una base nueva y vacía el diff (en desarrollo avisa si había ediciones y no hubo consulta).
- **Tras guardar**, llama a `ref.reset(rows)` con las filas guardadas para marcarlas como base.
- **Selección entre páginas.** La selección por id conserva los ids de otras páginas.
- **`pagination={false}`** envía `pageIndex: 0` con el tamaño de página por defecto; el servidor decide cuántas filas devuelve.

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
`onChange(data, change)` se dispara con cada edición; después, `column.onCommit({ row, value, prev, grid })`
permite recalcular otras celdas con `grid.patchRow`.

`errors` e `isValid` solo reflejan las celdas ya validadas (al confirmarlas o con `validate()`), así que
llama a `validate()` antes de guardar, como en el ejemplo. `validate()` tampoco puede señalar en pantalla una
columna oculta: declara las columnas `required` con `hideable: false`.

`onAddRow` muestra el botón de la barra y es quien crea la fila; `ref.addRow()` sin argumento también lo llama:

```tsx
// Recomendado: salta a la página de la fila y enfoca su primera celda editable.
<DataGrid ref={ref} columns={columns} defaultValue={rows} getRowId={(row) => row.id}
  onAddRow={() => ref.current?.addRow(blankRow())} />;

// Controlado (solo modo cliente; con serverSide usa ref.addRow): también cuenta en addedIds, pero no salta de página ni mueve el foco.
<DataGrid columns={columns} value={rows} getRowId={(row) => row.id}
  onAddRow={() => setRows((current) => [...current, blankRow()])} />;
```

- **Modo controlado.** El primer `value` no vacío, mientras la grilla está intacta y vacía, se adopta como
  base: una carga asíncrona empieza con el diff vacío. Para recargas posteriores usa `ref.reset(rows)`.
  Un arreglo antiguo que la grilla ya emitió se ignora; para revertir, usa `ref.reset(rows)`. Un padre
  que ignora `onChange` conserva la edición hasta que `value` cambie de identidad.
- **Estabilidad.** `columns` y `cellTypes` deben ser estables (constante de módulo o `useMemo`); si no,
  se re-renderizan todas las filas. Las filas están memorizadas: las closures de `render` y `format` solo se
  refrescan cuando cambia `columns`, así que inclúyelas en las dependencias de ese `useMemo`.
- **Consulta.** Con `readOnly` o sin columnas editables, `getData()` devuelve `dirtyIds`, `addedIds` y
  `removedIds` vacíos y no se marca `data-dirty`. `readOnly` oculta el botón Agregar, pero los métodos de `ref`
  siguen actuando: `addRow` añade la fila (o llama a `onAddRow`) y `removeRow` la quita, sin reflejarse en el diff.
- **Selección.** `removeRow` y `reset` quitan de la selección las filas que desaparecen y lo avisan por
  `onSelectionChange`; las filas ocultas por un filtro siguen seleccionadas.
- **Celdas propias.** Una celda de `cellTypes` en una columna editable recibe `editable`, `onCommit` y `error`, y es
  destino de `focusCell` si contiene un control enfocable. El tipo `lookup` no tiene editor propio: sin `cellTypes`
  se muestra en lectura.
- **`editorProps`.** `className` y `classNames` se suman a los de la celda; `onBlur` y `onKeyDown` se componen con la
  confirmación. La celda conserva `value`, `onCommit`/`onValueChange` y `aria-label`.
- **Teclado.** Enter confirma y baja; en una celda inválida, Enter se queda. Tab confirma y avanza, y
  puede salir de una celda inválida. Escape descarta el borrador.
- **Dentro de un `Dialog`.** El primer Escape revierte un borrador pendiente y el segundo cierra el diálogo.
- **Negativos.** Los números no dejan teclear negativos por defecto: usa `editorProps: { allowNegative: true }`.
  Un negativo que ya está en los datos se muestra y se conserva.

`NumberField` (en `forms`) es el editor numérico: separador de miles mientras se escribe, valor público
`number | null` y `onCommit` al salir o con Enter.

```tsx
import { NumberField } from "@teams4soft/teams4soft-ui/forms";

<NumberField mode="currency" value={amount} onValueChange={setAmount} aria-label="Importe" />;
```

### Buscadores de catálogo: EntityLookupField y EntityLookupGroup

Viven en `./data-display`, junto a `DataGrid`, que usan para mostrar los resultados en un
modal. Requieren los mismos peers que `DataGrid` y `Dialog`. La librería nunca hace HTTP:
`search` es una función tuya y devuelve un arreglo (paginación en cliente),
`{ items, total }` (paginación en el servidor) o `null` (abortar sin tocar la interfaz).

```tsx
import { EntityLookupField } from "@teams4soft/teams4soft-ui/data-display";
import type { DataGridColumn } from "@teams4soft/teams4soft-ui/data-display";

type Provider = { id: number; code: string; name: string };
// Define las columnas fuera del render o con useMemo.
const columns: DataGridColumn<Provider>[] = [
  { field: "code", header: "Código" },
  { field: "name", header: "Nombre" },
];

const [provider, setProvider] = useState<Provider | null>(null);

// El padre debe aplicar `onSelectionChange`: `selectedItem` es controlado.
<EntityLookupField<Provider>
  label="Proveedor"
  selectedItem={provider}
  onSelectionChange={setProvider}
  getItemId={(item) => item.id}
  getItemLabel={(item) => item.name}
  columns={columns}
  clearable
  search={async (query, { page, pageSize, criterion, signal }) => {
    const response = await fetch(`/api/providers?q=${query}&page=${page}&size=${pageSize}`, { signal });
    const { rows, total } = await response.json();
    return { items: rows, total };
  }}
/>;
```

- Local: pasa `items` en lugar de `search`. Enter o «…» con texto abren el modal con las filas filtradas.
- Remoto: `ctx.page` empieza en 1 y `ctx.signal` se aborta si llega otra búsqueda. Con una sola coincidencia
  se selecciona sin abrir el modal (`autoSelectSingle`); sin coincidencias aparece un aviso, con
  «Sí, crear nuevo» si pasas `onCreateRequest`.
- `searchOnEnter="dirty"` hace que Enter busque solo si el texto difiere de la etiqueta de la selección
  vigente, como Tab. Por defecto (`"always"`) Enter con texto siempre busca.
- `restoreCancelledText` devuelve la etiqueta de la selección cuando una búsqueda termina sin elegir nada:
  al cerrar el aviso sin aceptar, o al salir del campo tras cancelar el modal. La celda `lookup` lo activa.
- `criteria` convierte «…» en un menú de criterios; `criterion` viaja en `ctx` y se conserva al paginar.
- `resolveOnBlur` resuelve el texto al salir del campo; `renderEntityForm` añade «Nuevo» / «Consultar» en el
  modal; `onTriggerClick` reemplaza la búsqueda por una acción propia.
- En una columna `type: "lookup"` del `DataGrid`, la celda usa este campo con `loadOptions` y `lookupColumns`.

`EntityLookupGroup` es el equivalente con varios campos: cada uno manda su propio parámetro al back y
«…» va en uno solo (`primary`, por defecto el último). Es controlado con `values` y `onValuesChange`.

```tsx
import { EntityLookupGroup } from "@teams4soft/teams4soft-ui/data-display";
import type { LookupGroupField } from "@teams4soft/teams4soft-ui/data-display";

const fields: LookupGroupField[] = [
  { key: "lastName", param: "apellidoPaterno", label: "Apellido paterno", selectField: "lastName" },
  { key: "motherLastName", param: "apellidoMaterno", label: "Apellido materno", selectField: "motherLastName" },
  { key: "firstName", param: "nombre", label: "Nombre", selectField: "firstName" },
];

const [values, setValues] = useState({ lastName: "", motherLastName: "", firstName: "" });

<EntityLookupGroup<Person>
  fields={fields}
  values={values}
  onValuesChange={setValues}
  search={(params, ctx) => searchPeople(params, ctx)}
  getItemId={(item) => item.id}
  columns={personColumns}
  gridColumns={3}
/>;
```

`params` lleva cada campo buscable con su propio valor; `searchParam` (por defecto `"search"`) lleva el
término genérico mientras la captura esté incompleta. Elegir una fila llama a `onValuesChange` una sola vez
con todos los campos que tengan `selectField`.

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

**Sin publicar:** G2 — edición de `DataGrid` (celdas editables, validación, `getData()`, `onChange`, handle imperativo) y el nuevo `NumberField`. Entra en la `0.5.0` sin versión propia. Le sigue G3: opciones remotas (`loadOptions`) y consultas al servidor (`serverSide`).

`beta.3` y `beta.4` existen solo en el repositorio y no se publicaron: su contenido sale en la `0.5.0-beta.5`.

| Versión | Fase | Contenido |
| --- | --- | --- |
| 0.5.0-beta.4 (no se publicó) | G1 — Menú de filtros | Cada encabezado filtrable lleva un icono que abre un menú con condición y valor; reemplaza la fila de filtros. Nuevas `filterOperators`, `messages.filter*` y slots `filterButton` y `filterMenu`. Se eliminan los slots `filterRow` y `filterCell` y el token `--ui-grid-filter-height`. |
| 0.5.0-beta.3 (no se publicó) | Correcciones | El cuerpo de `Dialog` trae padding por defecto (`classNames={{ body: "p-0" }}` lo quita) y su pie alinea a la derecha. `RadioGroup` alinea sus opciones al inicio. `FeedbackDialog` avisa en desarrollo si `rejectLabel` llega sin `showReject`. |
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
