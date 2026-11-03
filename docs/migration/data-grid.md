# Migrar de PrimeReact a `DataGrid`

Guía para el equipo del frontend que prueba `0.5.0-beta.5`. Cubre `DataTable` + `Column` (PrimeReact), `InputCurrency` e `InputFilter`. Los nombres de este documento salen de los tipos de la librería (`DataGrid.types.ts`, `NumberField.types.ts`, `EntityLookupField.types.ts`), no de la propuesta original.

## Instalar la beta

Instala la versión exacta. Con `minimumReleaseAge` de pnpm 11, `@next` resuelve a la versión anterior durante las primeras 24 horas. Si tu proyecto define `minimumReleaseAge`, pnpm también bloquea la instalación exacta durante ese tiempo (`minimumReleaseAgeStrict` es `true` por defecto cuando se configura explícitamente): añade `@teams4soft/teams4soft-ui` a `minimumReleaseAgeExclude` o espera 24 horas.

```bash
pnpm add @teams4soft/teams4soft-ui@0.5.0-beta.5
pnpm add @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-toast @radix-ui/react-dialog
```

TanStack Table viene dentro del paquete: no lo instales. Importa los estilos una vez en `main.jsx`:

```js
import "@teams4soft/teams4soft-ui/styles.css";
```

`styles.css` trae el preflight de Tailwind. El frontend ya usa Tailwind 4, así que debería ser el mismo reset, pero compruébalo en una pantalla con PrimeReact: si altera sus estilos, avísanos y publicamos una variante sin preflight.

## Diferencias conocidas

Lo que vas a notar en esta beta. Nada de esto está implementado; se corrige en una `beta.6` solo si el piloto de Primas por cobrar lo necesita.

**Reglas AND/OR por columna.** `showFilterOperator` no tiene equivalente en `0.5.0`: cada columna admite un único filtro (condición y valor). Si una pantalla filtra "mayor que X y menor que Y" sobre la misma columna, resuélvelo fuera de la grilla (dos campos en la barra superior que alimenten tu consulta) o deja la condición más útil con `filterOperators`. La API admite añadirlas después sin romper nada.

**Endoso al salir de la celda sin cambiar el valor.** `column.onCommit` solo se dispara cuando el valor cambia, y no hay un hook de salida por fila. Una consulta que hoy se hace en el `onBlur` del input (la de las cuotas de la póliza al salir de Endoso) no se repetirá si la persona entra y sale sin tocar el texto. Qué hacer: si basta con consultar cuando cambia, usa `onCommit`; si necesitas la salida, pasa un `onBlur` en `editorProps` (se compone con la confirmación de la celda), sabiendo que no está cubierto por pruebas en este caso. `editorProps.onBlur` funciona solo en celdas de texto y número; se ignora en las columnas `lookup` y `select`.

**Búsqueda de `EntityLookupField` en curso.** Una búsqueda que aún no respondió puede pisar acciones que la persona hizo después, cuando por fin llega su resultado. Qué hacer: respeta `ctx.signal` en tu `search` (se aborta cuando llega otra búsqueda) y evita cambiar la selección desde código mientras haya una búsqueda pendiente.

**Modal abierto por el padre sin fila preseleccionada.** Si controlas `open` desde el padre, el modal se abre sin marcar la fila de la selección vigente; la preselección solo la da el botón "…" del campo cuando el texto es la etiqueta de la selección. Qué hacer: si necesitas la fila marcada, abre el modal desde el propio campo; si lo abres desde el padre, la persona tendrá que volver a elegirla.

**`defaultOpen` remoto bajo StrictMode.** En desarrollo, con `<React.StrictMode>`, un `EntityLookupField` remoto con `defaultOpen` se cierra solo. En producción no ocurre. Qué hacer: usa `open` / `onOpenChange` controlados.

**Foco inicial del modal en modo cliente.** Al abrir el modal de búsqueda con datos locales (`items`), el foco inicial cae en el encabezado del diálogo y no en la tabla de resultados, así que quien navega con teclado necesita un Tab más para llegar a ella. No requiere cambios en tu código.

## PrimeReact -> `DataGrid`

`DataGrid` y las factorías (`textColumn`, `amountColumn`, `dateColumn`, `selectColumn`, `actionsColumn`) viven en `@teams4soft/teams4soft-ui/data-display`.

| PrimeReact | `DataGrid` | Nota |
| --- | --- | --- |
| `value` | `value` (controlado) o `defaultValue` | `value` es la fuente de verdad; con `defaultValue` la grilla guarda las filas y las lees con `ref.getData()`. |
| `dataKey="id"` | `getRowId={(row) => String(row.id)}` | Es una función y devuelve `string`. |
| `<Column field header sortable filter>` | `DataGridColumn`: `{ field, header, sortable, filter }` | `sortable` y `filter` están activos por defecto; se apagan con `sortable: false` y `filter: false`. `filter` también acepta el tipo (`"text"`, `"number"`, `"date"`, `"select"`). Las factorías fijan `type` y formato. |
| `filterDisplay="menu"` | Comportamiento por defecto | Cada encabezado filtrable lleva un icono que abre un menú con condición y valor. No hay fila de filtros. |
| `showFilterMatchModes`, `filterMatchModeOptions` | `filterOperators` en la columna | Lista de condiciones permitidas; la primera es la inicial y, con una sola, se oculta el selector. |
| `showFilterOperator` (AND/OR) | Sin equivalente en `0.5.0` | Un filtro por columna. Ver "Diferencias conocidas". |
| `body={(row) => ...}` | `format: (value, row) => ReactNode`, o `type: "custom"` con `render: ({ row, value, rowId, grid }) => ReactNode` | `format` ajusta cómo se ve una celda de lectura; `render` es para contenido propio (botones, iconos). |
| `editor` + `onCellEditComplete` | `editable: true` (o `(row) => boolean`) + `onCommit` | Se edita en el sitio. `onCommit({ row, value, prev, grid })` recibe el valor ya tipado; recalcula otras celdas con `grid.patchRow(id, partial)`. |
| `selection` / `onSelectionChange` (objetos) | `selection` / `onSelectionChange` con **ids** (`string[]`) | Requiere `selectionMode="single"` o `"multiple"`. La selección conserva los ids de otras páginas. |
| `lazy` + `onPage` / `onSort` / `onFilter` | `serverSide={{ totalRecords, onQueryChange }}` | Una sola función recibe `{ pageIndex, pageSize, sorting, filters }`. `pageIndex` empieza en 0; cada filtro es `{ operator, value }`. |
| `sortField` / `sortOrder` | `initialSort={{ field, direction: "asc" \| "desc" }}` | `direction` reemplaza al 1 / -1. Con `serverSide`, el orden vigente llega en `query.sorting`. |
| `rowClassName` | `getRowClassName: (row) => string \| undefined` | |
| `onRowClick`, `onRowDoubleClick` | `onRowClick`, `onRowDoubleClick` | Mismo nombre, otra firma: `(row, event)`. PrimeReact entrega `{ originalEvent, data }`. |
| `loading` | `loading` | Primera carga sin filas: skeleton; con filas: capa que bloquea la interacción. |
| `paginator`, `rows`, `rowsPerPageOptions` | `pagination={{ pageSize, pageSizeOptions }}` o `pagination={false}` | Paginador activo por defecto (10 filas; 10, 25 y 50). |
| `totalRecords` | `serverSide.totalRecords` | |
| `emptyMessage` | `emptyState={{ title, hint }}` | |
| `scrollHeight` | `maxHeight` | |

Las condiciones de filtro (`DataGridFilterOperator`) son `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`, `before` y `after`. Si usabas `dateIs`, `dateBefore` o `dateAfter`, pasan a `equals`, `before` y `after`. `in`, `between` y los modos personalizados no tienen equivalente.

### El cambio de modelo

- **Filas por id.** La grilla guarda las filas por `getRowId`, no por posición. Editar con un orden o filtro activo modifica la fila correcta, y teclear re-renderiza una sola fila. `ref.patchRow(id, partial)` y `ref.removeRow(id)` trabajan por id.
- **Un JSON de salida.** `onChange(data, change)` y `ref.getData()` devuelven siempre la misma forma:

  ```ts
  type DataGridData<T> = {
    rows: T[];
    selectedIds: string[];
    dirtyIds: string[];   // filas modificadas
    addedIds: string[];
    removedIds: string[];
    errors: Record<string, Record<string, string>>; // rowId -> field -> mensaje
    isValid: boolean;
  };
  ```

  Ejemplo: `{ "rows": [{ "id": "r-1", "collectedAmount": 1250.5, "dueDate": "2026-10-29" }], "selectedIds": ["r-1"], "dirtyIds": ["r-1"], "addedIds": [], "removedIds": [], "errors": { "r-1": { "paymentMethod": "Requerido" } }, "isValid": false }`.
- **Valores tipados.** Los números llegan como `number`, las fechas como ISO `YYYY-MM-DD` y el vacío como `null`. Se acabó el `"0.00"` como cadena y el `num()` en cada mapper: convierte al leer el back, no al leer la grilla.
- **Validar antes de guardar.** `errors` e `isValid` solo reflejan celdas ya validadas. Llama a `ref.current?.validate()` antes de guardar; pinta los errores y devuelve `isValid`. Las columnas `required` deben llevar `hideable: false`, porque `validate()` no puede señalar una columna oculta.
- **Estabilidad.** `columns` y `cellTypes` deben ser estables (constante de módulo o `useMemo`). Las filas están memorizadas: las closures de `render` y `format` solo se refrescan cuando cambia `columns`, así que incluye sus dependencias en ese `useMemo`.
- **Servidor.** Con `serverSide`, `value` es la página actual. Un `value` con otro conjunto de ids es la base nueva y no emite `onChange`. Tras guardar, llama a `ref.reset(rows)`. El detalle está en el README.

### Ejemplo: Primas por cobrar

Antes (ilustrativo, PrimeReact):

```jsx
<DataTable
  value={cuotas} dataKey="id" lazy paginator rows={lazyState.rows} first={lazyState.first}
  totalRecords={total} loading={loading} sortField={lazyState.sortField} sortOrder={lazyState.sortOrder}
  filters={lazyState.filters} filterDisplay="menu"
  onPage={onLazy} onSort={onLazy} onFilter={onLazy}
>
  <Column field="policy" header="Póliza" sortable filter editor={textEditor} onCellEditComplete={onEdit} />
  <Column field="collected" header="Imp. cobrado" sortable filter editor={moneyEditor} onCellEditComplete={onEdit}
    body={(row) => Number(row.collected).toFixed(2)} />
  <Column field="commission" header="Com. desc." editor={moneyEditor} onCellEditComplete={onEdit} />
  <Column header="Acciones" body={(row) => <Button icon="pi pi-times" onClick={() => remove(row)} />} />
</DataTable>
```

Después, sobre la story `PrimasPorCobrarCompleta` de Storybook (500 cuotas en un servidor simulado), con las columnas relevantes:

```tsx
import * as React from "react";
import { DataGrid, actionsColumn, amountColumn, selectColumn, textColumn } from "@teams4soft/teams4soft-ui/data-display";
import type { DataGridColumn, DataGridData, DataGridHandle, DataGridQuery } from "@teams4soft/teams4soft-ui/data-display";

type Installment = {
  id: string; selected: boolean; branch: number | null; line: number | null; policy: string; endorsement: string;
  insured: string; premium: number; collected: number | null; commission: number | null; net: number;
};
type LineOption = { value: number; code: string; label: string };

const getInstallmentId = (row: Installment) => row.id;
const netOf = (premium: number, collected: unknown, commission: unknown) =>
  premium - (typeof collected === "number" ? collected : 0) - (typeof commission === "number" ? commission : 0);
const lineColumns: DataGridColumn<LineOption>[] = [
  { field: "code", header: "Código", minWidth: 80 },
  { field: "label", header: "Ramo", minWidth: 140 },
];

function PrimasPorCobrar() {
  const ref = React.useRef<DataGridHandle<Installment>>(null);
  const [rows, setRows] = React.useState<Installment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const latest = React.useRef(0);

  const onQueryChange = React.useCallback((query: DataGridQuery) => {
    const request = ++latest.current;
    setLoading(true);
    // query.pageIndex desde 0; query.filters[field] = { operator, value }
    api.installments(query).then((page) => {
      if (request !== latest.current) return; // descarta respuestas viejas
      setRows(page.rows);
      setTotal(page.total);
    }).finally(() => {
      if (request === latest.current) setLoading(false);
    });
  }, []);
  const serverSide = React.useMemo(() => ({ totalRecords: total, onQueryChange }), [total, onQueryChange]);

  const columns = React.useMemo<DataGridColumn<Installment>[]>(() => [
    { field: "selected", header: "Imputar", type: "checkbox", editable: true, filter: false, align: "center", width: 90 },
    selectColumn<Installment, { value: number; label: string }>("branch", "Sucursal", {
      options: [{ value: 1, label: "Quito" }, { value: 2, label: "Guayaquil" }], editable: true, minWidth: 140,
    }),
    { field: "line", header: "Ramo", type: "lookup", editable: true, required: true, minWidth: 220, filter: false,
      loadOptions: (query) => api.searchLines(query), lookupColumns: lineColumns },
    textColumn<Installment>("policy", "Póliza", { editable: true, frozen: "left", minWidth: 140, editorProps: { maxLength: 12 } }),
    textColumn<Installment>("endorsement", "Endoso", {
      editable: true, minWidth: 100,
      onCommit: ({ row, value, grid }) => {
        void api.installmentsOf(row.policy, String(value)).then((found) => grid.patchRow(row.id, { insured: found.insured }));
      },
    }),
    amountColumn<Installment>("premium", "A aplicar"),
    amountColumn<Installment>("collected", "Imp. cobrado", {
      editable: true, minWidth: 130,
      onCommit: ({ row, value, grid }) => grid.patchRow(row.id, { net: netOf(row.premium, value, row.commission) }),
    }),
    amountColumn<Installment>("commission", "Com. desc.", {
      editable: (row) => row.collected !== null, minWidth: 120,
      onCommit: ({ row, value, grid }) => grid.patchRow(row.id, { net: netOf(row.premium, row.collected, value) }),
    }),
    amountColumn<Installment>("net", "Neto recaudar"),
    actionsColumn<Installment>([{ label: "Eliminar fila", icon: "×", onClick: (row) => ref.current?.removeRow(row.id) }]),
  ], []);

  const onChange = React.useCallback((data: DataGridData<Installment>) => setRows(data.rows), []);
  const addRow = React.useCallback(() => {
    ref.current?.addRow({ id: `nueva-${crypto.randomUUID()}`, selected: true, branch: null, line: null, policy: "", endorsement: "",
      insured: "", premium: 0, collected: null, commission: null, net: 0 });
  }, []);

  const save = async () => {
    if (!ref.current?.validate()) return;
    const data = ref.current.getData();
    await api.save(data.rows.filter((row) => data.dirtyIds.includes(row.id) || data.addedIds.includes(row.id)), data.removedIds);
    ref.current.reset(data.rows);
  };

  return <DataGrid ref={ref} columns={columns} value={rows} getRowId={getInstallmentId} loading={loading}
    serverSide={serverSide} onChange={onChange} onAddRow={addRow} maxHeight="45vh"
    pagination={{ pageSize: 10, pageSizeOptions: [10, 25, 50] }} />;
}
```

`api` representa los servicios del frontend; la story completa, con el servidor simulado, está en `src/data-display/data-grid/DataGrid.stories.tsx`. Qué cambia respecto al "antes": el estado `lazy` (`first`, `rows`, `sortField`, `filters`) y los tres handlers desaparecen en una sola `onQueryChange`; el `editor` + `onCellEditComplete` de cada columna pasa a `editable` + `onCommit`; el `body` que formateaba con `toFixed(2)` ya no hace falta, porque `amountColumn` formatea y el valor llega como `number`; las acciones por fila son una `actionsColumn`.

## `InputCurrency` -> `NumberField`

`NumberField` vive en `@teams4soft/teams4soft-ui/forms`. Valor público `number | null` (vacío es `null`, nunca `0` ni `""`), separador de miles mientras se escribe, y `onCommit` al salir o con Enter.

| `InputCurrency` | `NumberField` |
| --- | --- |
| `onChange({ value })` / `onValueChange({ value })` | `onValueChange(value)`: recibe el número directamente. Si tu código espera `{ value }`, envuélvelo en el adaptador. |
| `decimals` | `fractionDigits` |
| `minFractionDigits` / `maxFractionDigits` | igual |
| `currencySymbol` | igual (por defecto `"$"`; con `mode="currency"`) |
| `inputClassName` | `classNames.input` |
| `label`, `helperText`, `errorText`, `required` | `FormField`: envuelve el campo (`NumberField` no lleva `label`) |
| `value` como cadena (`"0.00"`) | Solo acepta `number \| null`: convierte antes con `Number(...)` o `parseNumber` |

Nuevas props: `mode` (`"decimal"` por defecto, `"currency"`, `"percent"`, `"integer"`), `min` y `max` (marcan inválido, no recortan) y `locale` (`es-MX`: miles `,` y decimal `.`). Los negativos se ignoran salvo con `allowNegative`. El porcentaje se guarda como número entero de puntos: 15 % es `15`.

```tsx
import { NumberField } from "@teams4soft/teams4soft-ui/forms";

<NumberField mode="currency" fractionDigits={2} value={amount} onValueChange={setAmount} aria-label="Importe" />;
<NumberField mode="percent" value={rate} onValueChange={setRate} aria-label="Tasa" />;
```

Dentro de `DataGrid`, las columnas `currency`, `percent` y `number` ya usan `NumberField` como editor; `editorProps` le pasa props (`editorProps: { allowNegative: true }`).

## `InputFilter` -> `EntityLookupField`

`EntityLookupField` (y `EntityLookupGroup`, para varios campos) vive en `@teams4soft/teams4soft-ui/data-display`. La librería nunca hace HTTP: `search` es tuya y devuelve un arreglo, `{ items, total }` o `null`.

| `InputFilter` | `EntityLookupField` |
| --- | --- |
| `dataKey` | `getItemId` |
| `displayField` | `getItemLabel` |
| valor / selección | `selectedItem` + `onSelectionChange` (objeto completo; controlado) |
| `openSignal` (contador) | `open` / `onOpenChange` controlados |
| `isClearable` | `clearable` |
| `resetForm` / `onResetForm` | Sin equivalente: reacciona a `onSelectionChange(null)` |
| `extraButtons` | `trailingActions` |
| `buttonIcon` | `triggerIcon` |
| `loading` | `loading` (datos locales cargando) |
| `onChange({ target: { name, value, item, isNew } })` | `onInputValueChange` + `onSelectionChange` + `onCreateRequest` |
| `modalTitle`, `modalWidth`, `scrollHeight` | `dialogTitle`, `dialogSize`, `tableMaxHeight` |
| `filterOptions` | `criteria` (+ `criterion`, `defaultCriterion`, `onCriterionChange`) |
| `resolveOnBlur` | `resolveOnBlur` (+ `matchItem`, `onResolveNotFound`) |
| `createForm` | `renderEntityForm` |
| `defaultSortField` / `defaultSortOrder` | `initialSort={{ field, direction }}` |
| `pageNumber` / `filterType` en la petición | `ctx.page` (desde 1) y `ctx.criterion` en `search(query, ctx)` |
| `label`, `helperText`, `errorText`, `required`, `disabled`, `placeholder`, `id`, `name` | `label`, `description`, `errorMessage`, `required`, `disabled`, `placeholder`, `id`, `name` |
| `selectionMode="multiple"` | Sin equivalente: solo selección única. El frontend ya normaliza al último elegido. |

`normalizeSearchResults` ya no hace falta si tu servicio devuelve `{ items, total }` o un arreglo; el hack de `_existsProviderById` / `_matchesFilters` se reemplaza por `search` devolviendo `{ items: [], emptyReason, emptyMessage }`. Ejemplo mínimo en el README.

## Tema por módulo (Siniestros)

La tabla no tiene colores de producto, solo tokens `--ui-*`. Un módulo se tematiza sin tocar componentes; la story `Data display/DataGrid/Tema Siniestros` muestra la comparación con el tema por defecto. Bloque del módulo (valores de Siniestros: azul marino `#1f3864`, borde `#a7b0bc`, solo lectura `#f2f4f7`, fuente Arial):

```css
/* frontend: claimsTheme.css */
.claims-theme, body.claims-portals {
  --claims-navy: #1f3864;
  --claims-border: #a7b0bc;
  --claims-readonly: #f2f4f7;
  --claims-font: Arial, sans-serif;

  --ui-primary: var(--claims-navy);
  --ui-border: var(--claims-border);
  --ui-muted: var(--claims-readonly);
  --ui-radius-md: 0;
  --ui-grid-header-bg: var(--claims-navy);
  --ui-grid-header-fg: #fff;
  --ui-grid-row-alt: #f7f9fc;
  --ui-grid-font: var(--claims-font);
  font-family: var(--claims-font);
}
```

- **Portales.** El selector, el calendario y el modal de búsqueda se montan en el `body`, fuera de `.claims-theme`. Por eso el bloque también cubre `body.claims-portals`: añade esa clase al `body` mientras el módulo esté montado y quítala al salir.
- **Fuente.** Los portales heredan la fuente del `body`. `font-family: var(--claims-font)` en ese bloque la fija también ahí; `--ui-grid-font` solo alcanza a la tabla.
- **Radios.** Los componentes leen el radio por elemento, así que se tematiza `--ui-radius-*` (`--ui-radius-md`, `--ui-radius-lg`, ...), nunca `--radius-ui-*`. Los diálogos usan `--ui-radius-lg`: se quedan redondeados salvo que el módulo añada `--ui-radius-lg: 0`.
- **Sobrescribir en un subárbol.** Los `--ui-*` sobrescritos en cualquier ancestro llegan a las utilidades. Las variables internas `--color-ui-*` ya no se emiten en `dist/styles.css`; nunca fueron API documentada, así que no las uses en tu CSS.
- Tokens de la tabla: `--ui-grid-header-bg`, `--ui-grid-header-fg`, `--ui-grid-row-alt`, `--ui-grid-row-hover`, `--ui-grid-row-selected`, `--ui-grid-cell-invalid`, `--ui-grid-font`, `--ui-grid-row-height`, `--ui-grid-row-height-compact`, `--ui-grid-editor-height` y `--ui-grid-editor-height-compact`. Para ajustes finos están los slots `classNames`.

## Orden de migración

Prueba y migra en este orden (spec, §13):

1. Instala la beta con su versión exacta y los peers Radix que pida (arriba).
2. Importa `styles.css` en `main.jsx` y verifica que el preflight no altera PrimeReact.
3. Crea el adaptador fino `src/components/tables/DataGrid.jsx`: fija los defaults del proyecto (paginación, densidad, mensajes) y registra las celdas propias que aún falten con `cellTypes`.
4. Página piloto: Primas por cobrar, la más exigente.
5. Luego, módulo por módulo: Advanced -> Unified -> `DataTableBase` -> `DataTable` crudo. Cada módulo conserva PrimeReact hasta que su pantalla pasa las pruebas; la convivencia es temporal.

Si algo falla o falta, anota la pantalla, el componente y el JSON de `getData()` (o la `DataGridQuery`) que reproduce el caso: con eso se corrige y sale otra beta antes de la `0.5.0`.
