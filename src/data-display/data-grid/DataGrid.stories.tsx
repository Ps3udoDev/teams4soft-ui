import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { Dialog } from "../../overlays";
import { DataGrid } from "./DataGrid";
import { actionsColumn, amountColumn, dateColumn, selectColumn, textColumn } from "./column-factories";
import type { DataGridColumn, DataGridData, DataGridFilterValue, DataGridHandle, DataGridQuery } from "./DataGrid.types";
import type { GridChange } from "./grid-rows-store";

type Premium = { id: string; policy: string; amount: number; dueDate: string; status: string };
const rows: Premium[] = Array.from({ length: 30 }, (_, index) => ({
  id: `premium-${index + 1}`,
  policy: `${index % 3 === 0 ? "Pérez" : "García"} — Póliza ${index + 1}`,
  amount: 1250.5 + index * 25,
  dueDate: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
  status: index % 2 ? "paid" : "pending",
}));
const columns: DataGridColumn<Premium>[] = [
  textColumn<Premium>("policy", "Póliza", { frozen: "left", resizable: true, minWidth: 160 }),
  amountColumn<Premium>("amount", "Imp. cobrado"),
  dateColumn<Premium>("dueDate", "Vencimiento"),
  selectColumn<Premium, { value: string; label: string }>("status", "Estado", {
    options: [{ value: "paid", label: "Pagada" }, { value: "pending", label: "Pendiente" }],
  }),
];
const getRowId = (row: Premium) => row.id;

const meta = {
  title: "Data display/DataGrid",
  component: DataGrid<Premium>,
  tags: ["autodocs"],
  args: { columns, value: rows, getRowId },
  parameters: {
    docs: { description: { component: "Tabla con orden, filtros por columna, selección por id, paginación local y edición en celda. Las columnas deben conservar una identidad estable." } },
  },
} satisfies Meta<typeof DataGrid<Premium>>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Basica: Story = {};

function SelectionExample() {
  const [selection, setSelection] = React.useState<string[]>([]);
  return <div className="grid gap-4">
    <DataGrid columns={columns} value={rows} getRowId={getRowId} selectionMode="multiple" selection={selection} onSelectionChange={setSelection} />
    <output aria-live="polite">Seleccionadas: {selection.join(", ") || "ninguna"}</output>
  </div>;
}
export const Seleccion: Story = { render: () => <SelectionExample /> };
export const Filtros: Story = {
  args: { pagination: false },
  parameters: { docs: { description: { story: "Pulsa el icono de cada encabezado para elegir la condición y el valor. Busca «perez» para comprobar la coincidencia sin diacríticos. Estado filtra por el valor de la opción, mostrando su etiqueta." } } },
};

function LoadingExample({ initial }: { initial: boolean }) {
  const [loading, setLoading] = React.useState(true);
  return <div className="grid gap-4">
    <Button onClick={() => setLoading((current) => !current)}>{loading ? "Finalizar carga" : "Iniciar carga"}</Button>
    <DataGrid columns={columns} value={initial && loading ? [] : rows} getRowId={getRowId} loading={loading} />
  </div>;
}
export const CargaInicial: Story = { render: () => <LoadingExample initial /> };
export const Recarga: Story = { render: () => <LoadingExample initial={false} /> };
export const Vacia: Story = { args: { value: [], emptyState: { hint: "Los registros aparecerán aquí cuando estén disponibles." } } };
export const PersistenciaColumnas: Story = {
  args: { persistKey: "storybook.premiums.g1" },
  parameters: { docs: { description: { story: "Oculta una columna y recarga la página: la visibilidad se restaura desde localStorage. Cambiar los campos invalida la configuración guardada." } } },
};
export const Compacta: Story = { args: { density: "compact", maxHeight: "38vh" } };

// Las columnas y cellTypes son constantes de módulo: con identidad inestable se re-renderizan todas las filas.

type Entry = { id: string; policy: string; amount: number | null; rate: number | null; units: number | null; dueDate: string | null; method: number | null; paid: boolean; side: "D" | "C" };
const methods = [{ value: 1, label: "Efectivo" }, { value: 2, label: "Tarjeta" }, { value: 3, label: "Transferencia" }];
const sides = [{ value: "D", label: "Débito" }, { value: "C", label: "Crédito" }];
const makeEntries = (count: number): Entry[] => Array.from({ length: count }, (_, index) => ({
  id: `entry-${index + 1}`,
  policy: `Póliza ${index + 1}`,
  amount: 1250.5 + index * 25,
  rate: 15,
  units: index + 1,
  dueDate: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
  method: (index % 3) + 1,
  paid: index % 2 === 0,
  side: index % 2 ? "C" : "D",
}));
const entryRows = makeEntries(8);
const entryId = (row: Entry) => row.id;

const editableColumns: DataGridColumn<Entry>[] = [
  textColumn<Entry>("policy", "Póliza", { editable: true, frozen: "left", minWidth: 160 }),
  amountColumn<Entry>("amount", "Importe", { editable: true }),
];

function EditableExample() {
  const ref = React.useRef<DataGridHandle<Entry>>(null);
  const [data, setData] = React.useState<DataGridData<Entry> | null>(null);
  return <div className="grid gap-4">
    <DataGrid ref={ref} columns={editableColumns} defaultValue={entryRows} getRowId={entryId} pagination={false} />
    <div><Button onClick={() => setData(ref.current?.getData() ?? null)}>Aceptar</Button></div>
    <pre aria-label="Resultado de getData" className="max-h-64 overflow-auto rounded border border-ui-border p-3 text-xs">{data ? JSON.stringify(data, null, 2) : "Edita celdas y pulsa Aceptar."}</pre>
  </div>;
}
export const Editable: Story = {
  render: () => <EditableExample />,
  parameters: { docs: { description: { story: "Modo no controlado: la grilla guarda las filas y `ref.getData()` devuelve las filas, los ids modificados, añadidos y eliminados, los errores e `isValid`. Escribe y confirma con Enter (baja), Tab o saliendo; Escape descarta el borrador." } } },
};

function ControlledExample() {
  const [rows, setRows] = React.useState(entryRows);
  const [last, setLast] = React.useState<GridChange | null>(null);
  return <div className="grid gap-4">
    <DataGrid columns={editableColumns} value={rows} getRowId={entryId} pagination={false}
      onChange={(data, change) => { setRows(data.rows); setLast(change); }} />
    <pre aria-label="Último cambio" className="rounded border border-ui-border p-3 text-xs">{last ? JSON.stringify(last) : "Sin cambios todavía."}</pre>
  </div>;
}
export const EditableControlada: Story = {
  render: () => <ControlledExample />,
  parameters: { docs: { description: { story: "Modo controlado: `onChange` entrega los datos y el último `change`. Un padre que ignora `onChange` conserva la edición hasta que `value` cambie de identidad." } } },
};

const validationColumns: DataGridColumn<Entry>[] = [
  textColumn<Entry>("policy", "Póliza", { editable: true, required: true, minWidth: 160 }),
  amountColumn<Entry>("amount", "Importe", { editable: true, validate: (value) => (typeof value === "number" && value > 5000 ? "Máximo 5,000.00" : null) }),
];
const validationRows: Entry[] = [{ ...entryRows[0]!, policy: "" }, { ...entryRows[1]!, amount: 9000 }, entryRows[2]!];
function ValidationExample() {
  const ref = React.useRef<DataGridHandle<Entry>>(null);
  const [result, setResult] = React.useState("Sin validar.");
  const run = () => {
    const ok = ref.current?.validate() ?? false;
    const errors = ref.current?.getData().errors ?? {};
    const first = Object.entries(errors)[0];
    const field = first ? Object.keys(first[1])[0] : undefined;
    if (first && field) ref.current?.focusCell(first[0], field);
    setResult(ok ? "Datos válidos." : `Hay errores en ${Object.keys(errors).length} fila(s).`);
  };
  return <div className="grid gap-4">
    <DataGrid ref={ref} columns={validationColumns} defaultValue={validationRows} getRowId={entryId} pagination={false} />
    <div className="flex items-center gap-3"><Button onClick={run}>Validar</Button><output aria-live="polite">{result}</output></div>
  </div>;
}
export const Validacion: Story = {
  render: () => <ValidationExample />,
  parameters: { docs: { description: { story: "`validate()` pinta los errores de todas las celdas editables y devuelve `isValid`; `focusCell` lleva el foco a la primera celda con error. «Póliza» es obligatoria e «Importe» no admite más de 5,000.00." } } },
};

const cellTypeColumns: DataGridColumn<Entry>[] = [
  textColumn<Entry>("policy", "Texto", { editable: true, frozen: "left", minWidth: 140 }),
  { field: "units", header: "Número", type: "number", align: "right", editable: true },
  amountColumn<Entry>("amount", "Moneda", { editable: true }),
  { field: "rate", header: "Porcentaje", type: "percent", align: "right", fractionDigits: 2, editable: true },
  dateColumn<Entry>("dueDate", "Fecha", { editable: true }),
  selectColumn<Entry, { value: number; label: string }>("method", "Select", { options: methods, editable: true }),
  { field: "paid", header: "Casilla", type: "checkbox", editable: true },
  { field: "side", header: "D/C", type: "radio", options: sides, editable: true },
];
export const TiposDeCelda: Story = {
  render: () => <DataGrid columns={cellTypeColumns} defaultValue={entryRows} getRowId={entryId} pagination={false} />,
  parameters: { docs: { description: { story: "Una columna editable de cada tipo. Para valores negativos usa `editorProps: { allowNegative: true }`." } } },
};

type Receivable = { id: string; policy: string; premium: number; collected: number | null; net: number };
const receivables: Receivable[] = [
  { id: "r-1", policy: "Pérez — Póliza 1", premium: 1500, collected: 500, net: 1000 },
  { id: "r-2", policy: "García — Póliza 2", premium: 2400, collected: null, net: 2400 },
  { id: "r-3", policy: "López — Póliza 3", premium: 980.5, collected: 980.5, net: 0 },
];
const receivableId = (row: Receivable) => row.id;
const receivableColumns: DataGridColumn<Receivable>[] = [
  textColumn<Receivable>("policy", "Póliza", { minWidth: 160 }),
  amountColumn<Receivable>("premium", "Prima"),
  amountColumn<Receivable>("collected", "Cobrado", {
    editable: true,
    onCommit: ({ row, value, grid }) => grid.patchRow(row.id, { net: row.premium - (typeof value === "number" ? value : 0) }),
  }),
  amountColumn<Receivable>("net", "Neto"),
];
export const PrimasPorCobrar: Story = {
  render: () => <DataGrid columns={receivableColumns} defaultValue={receivables} getRowId={receivableId} pagination={false} />,
  parameters: { docs: { description: { story: "Al confirmar «Cobrado», `onCommit` recalcula «Neto» con `grid.patchRow`." } } },
};

const dialogColumns: DataGridColumn<Entry>[] = [
  textColumn<Entry>("policy", "Póliza", { editable: true, minWidth: 140 }),
  dateColumn<Entry>("dueDate", "Fecha", { editable: true }),
  selectColumn<Entry, { value: number; label: string }>("method", "Forma", { options: methods, editable: true }),
];
function DialogExample({ viewMode }: { viewMode: string }) {
  const [open, setOpen] = React.useState(viewMode === "story");
  return <>
    <Button onClick={() => setOpen(true)}>Abrir cobros</Button>
    <Dialog open={open} onOpenChange={setOpen} title="Cobros" size="lg" classNames={{ body: "p-0" }}>
      <DataGrid columns={dialogColumns} defaultValue={entryRows} getRowId={entryId} pagination={false} />
    </Dialog>
  </>;
}
export const EditableEnDialog: Story = {
  render: (_args, { viewMode }) => <DialogExample viewMode={viewMode} />,
  parameters: { docs: { description: { story: "Dentro de un `Dialog`, el primer Escape descarta el borrador pendiente y el segundo cierra el diálogo. Los editores de fecha y select abren popovers anidados." } } },
};

// Back simulado en memoria con latencia de 400 ms. Datos deterministas.

const LATENCY_MS = 400;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Remote = { id: string; policy: string; amount: number; dueDate: string; status: string };
const surnames = ["Pérez", "García", "López", "Martínez", "Rodríguez"];
const remoteRows: Remote[] = Array.from({ length: 500 }, (_, index) => ({
  id: `remote-${index + 1}`,
  policy: `${surnames[index % surnames.length]} — Póliza ${index + 1}`,
  amount: 500 + ((index * 37) % 400) * 10,
  dueDate: `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
  status: index % 3 === 0 ? "paid" : "pending",
}));
const remoteColumns: DataGridColumn<Remote>[] = [
  textColumn<Remote>("policy", "Póliza", { minWidth: 200 }),
  amountColumn<Remote>("amount", "Importe"),
  dateColumn<Remote>("dueDate", "Vencimiento"),
  selectColumn<Remote, { value: string; label: string }>("status", "Estado", {
    options: [{ value: "paid", label: "Pagada" }, { value: "pending", label: "Pendiente" }],
  }),
];
const remoteId = (row: Remote) => row.id;

function matches(cell: unknown, { operator, value }: DataGridFilterValue) {
  const ordered = typeof cell === "number" || operator === "before" || operator === "after" || typeof value === "number";
  if (ordered) {
    const a = typeof cell === "number" ? cell : String(cell);
    const b = typeof value === "number" ? value : String(value);
    if (operator === "gt" || operator === "after") return a > b;
    if (operator === "gte") return a >= b;
    if (operator === "lt" || operator === "before") return a < b;
    if (operator === "lte") return a <= b;
    return operator === "notEquals" ? a !== b : a === b;
  }
  const a = plain(String(cell));
  const b = plain(String(value));
  switch (operator) {
    case "contains": return a.includes(b);
    case "notContains": return !a.includes(b);
    case "startsWith": return a.startsWith(b);
    case "endsWith": return a.endsWith(b);
    case "notEquals": return a !== b;
    default: return a === b;
  }
}

/** Pagina, ordena y filtra en memoria igual que lo haría el servidor. */
async function fetchRemote(query: DataGridQuery): Promise<{ rows: Remote[]; total: number }> {
  await delay(LATENCY_MS);
  let result = remoteRows.filter((row) => Object.entries(query.filters).every(([field, filter]) => matches(row[field as keyof Remote], filter)));
  const [sort] = query.sorting;
  if (sort) {
    const key = sort.field as keyof Remote;
    result = [...result].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return sort.desc ? -order : order;
    });
  }
  const start = query.pageIndex * query.pageSize;
  return { rows: result.slice(start, start + query.pageSize), total: result.length };
}

function ServerSideExample() {
  const [rows, setRows] = React.useState<Remote[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [count, setCount] = React.useState(0);
  const [last, setLast] = React.useState<DataGridQuery | null>(null);
  const [selection, setSelection] = React.useState<string[]>([]);
  const latest = React.useRef(0);
  const onQueryChange = React.useCallback((query: DataGridQuery) => {
    const request = ++latest.current;
    setCount((current) => current + 1);
    setLast(query);
    setLoading(true);
    void fetchRemote(query).then((page) => {
      // Una respuesta que ya no es la última se descarta.
      if (request !== latest.current) return;
      setRows(page.rows);
      setTotal(page.total);
    }).catch(() => {
      // Un fallo real se informaría aquí; el finally evita dejar la grilla inerte.
    }).finally(() => {
      if (request === latest.current) setLoading(false);
    });
  }, []);
  const serverSide = React.useMemo(() => ({ totalRecords: total, onQueryChange }), [total, onQueryChange]);
  return <div className="grid gap-4">
    <DataGrid columns={remoteColumns} value={rows} getRowId={remoteId} loading={loading} serverSide={serverSide}
      selectionMode="multiple" selection={selection} onSelectionChange={setSelection}
      pagination={{ pageSize: 10, pageSizeOptions: [10, 25, 50] }} />
    <output aria-live="polite" aria-label="Consultas" className="rounded border border-ui-border p-3 text-xs">
      <span data-testid="query-count">Consultas al servidor: {count}</span>
      <br />
      <span data-testid="last-query">Última: {last ? JSON.stringify(last) : "ninguna"}</span>
      <br />
      <span data-testid="selected-count">Seleccionadas: {selection.length}</span>
    </output>
  </div>;
}
export const ServerSide: Story = {
  render: () => <ServerSideExample />,
  parameters: { docs: { description: { story: "500 registros en memoria con 400 ms de latencia. Página, orden y filtros viajan en `onQueryChange` (una consulta por cambio, `pageIndex` desde 0); un cambio de orden o filtro vuelve a la primera página. Las respuestas que llegan tarde se descartan. La selección conserva los ids de otras páginas." } } },
};

type Policy = { id: string; policy: string; insurer: number | null };
const insurerNames = ["Allianz", "Axa", "Banorte", "Chubb", "GNP", "HDI", "Inbursa", "Mapfre", "Qualitas", "Zurich"];
const insurers = insurerNames.flatMap((name, index) => ["Vida", "Auto", "Hogar", "Salud"].map((line, j) => ({ value: index * 4 + j + 1, label: `${name} ${line}` })));
const policyRows: Policy[] = [
  { id: "p-1", policy: "Póliza 1", insurer: 1 },
  { id: "p-2", policy: "Póliza 2", insurer: 18 },
  { id: "p-3", policy: "Póliza 3", insurer: 35 },
  { id: "p-4", policy: "Póliza 4", insurer: null },
  { id: "p-5", policy: "Póliza 5", insurer: 8 },
];
const policyId = (row: Policy) => row.id;

function RemoteSelectExample() {
  const [calls, setCalls] = React.useState<string[]>([]);
  const [fail, setFail] = React.useState(false);
  const [generation, setGeneration] = React.useState(0);
  const failRef = React.useRef(fail);
  failRef.current = fail;
  // Las columnas son estables: el cargador lee el interruptor por ref.
  const columns = React.useMemo<DataGridColumn<Policy>[]>(() => [
    textColumn<Policy>("policy", "Póliza", { minWidth: 140 }),
    { field: "insurer", header: "Aseguradora", type: "select", filter: "select",
      editable: true,
      minWidth: 220,
      loadOptions: async (query) => {
        setCalls((current) => [...current, query]);
        await delay(LATENCY_MS);
        if (failRef.current) throw new Error("Servicio no disponible");
        return insurers.filter((option) => plain(option.label).includes(plain(query)));
      },
    },
  ], []);
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center gap-3">
      <Button aria-pressed={fail} onClick={() => setFail((current) => !current)}>{fail ? "Fallo simulado: activado" : "Fallo simulado: desactivado"}</Button>
      <Button onClick={() => { setCalls([]); setGeneration((current) => current + 1); }}>Volver a montar</Button>
    </div>
    <DataGrid key={generation} columns={columns} defaultValue={policyRows} getRowId={policyId} pagination={false} />
    <output aria-live="polite" aria-label="Llamadas a loadOptions" className="rounded border border-ui-border p-3 text-xs">
      <span data-testid="load-count">Llamadas a loadOptions: {calls.length}</span>
      <br />
      <span data-testid="load-log">Consultas: {calls.length ? calls.map((query) => `«${query}»`).join(", ") : "ninguna"}</span>
    </output>
  </div>;
}
export const SelectRemoto: Story = {
  render: () => <RemoteSelectExample />,
  parameters: { docs: { description: { story: "«Aseguradora» carga su catálogo con `loadOptions` (400 ms): primero se ve el valor y luego la etiqueta. Escribir en la celda busca una vez tras 250 ms; el menú de filtro reutiliza el catálogo. Activa el fallo simulado y busca un texto nuevo para ver el error en la lista; al reabrir el selector se reintenta el catálogo y al volver a escribir se reintenta la búsqueda." } } },
};

type Installment = {
  id: string; selected: boolean; branch: number | null; line: number | null; policy: string; endorsement: string;
  insured: string; premium: number; collected: number | null; commission: number | null; net: number; observations: string;
};
type LineOption = { value: number; code: string; label: string };
const branchOptions = [{ value: 1, label: "Quito" }, { value: 2, label: "Guayaquil" }, { value: 3, label: "Cuenca" }];
const lineOptions: LineOption[] = Array.from({ length: 24 }, (_, index) => ({
  value: index + 1,
  code: `R${String(index + 1).padStart(2, "0")}`,
  label: `${["Vida", "Auto", "Hogar", "Salud", "Incendio", "Transporte"][index % 6]!} ${Math.floor(index / 6) + 1}`,
}));
const lineColumns: DataGridColumn<LineOption>[] = [{ field: "code", header: "Código", minWidth: 80 }, { field: "label", header: "Ramo", minWidth: 140 }];
const makeInstallments = (): Installment[] => Array.from({ length: 500 }, (_, index) => {
  const premium = 800 + ((index * 53) % 300) * 10;
  const collected = index % 4 === 0 ? null : premium / 2;
  return {
    id: `cuota-${index + 1}`, selected: index % 5 !== 0, branch: (index % 3) + 1, line: (index % lineOptions.length) + 1,
    policy: `POL-${String(1000 + index)}`, endorsement: String(index % 4), insured: `${surnames[index % surnames.length]} ${index + 1}`,
    premium, collected, commission: 0, net: premium - (collected ?? 0), observations: index % 7 === 0 ? "Revisar cobranza" : "",
  };
});
const installmentId = (row: Installment) => row.id;
const netOf = (premium: number, collected: unknown, commission: unknown) =>
  premium - (typeof collected === "number" ? collected : 0) - (typeof commission === "number" ? commission : 0);

function PrimasCompletaExample() {
  const ref = React.useRef<DataGridHandle<Installment>>(null);
  // El "servidor" guarda cada edición confirmada, para que sobreviva al cambio de página.
  const db = React.useRef<Installment[]>(makeInstallments());
  const [rows, setRows] = React.useState<Installment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [queries, setQueries] = React.useState(0);
  const [saves, setSaves] = React.useState(0);
  const [consults, setConsults] = React.useState<string[]>([]);
  const [observed, setObserved] = React.useState<string | null>(null);
  const [lineQueries, setLineQueries] = React.useState<string[]>([]);
  const latest = React.useRef(0);
  const nextNew = React.useRef(0);

  const onQueryChange = React.useCallback((query: DataGridQuery) => {
    const request = ++latest.current;
    setQueries((current) => current + 1);
    setLoading(true);
    void (async () => {
      await delay(LATENCY_MS);
      let result = db.current.filter((row) => Object.entries(query.filters).every(([field, filter]) => matches(row[field as keyof Installment], filter)));
      const [sort] = query.sorting;
      if (sort) {
        const key = sort.field as keyof Installment;
        result = [...result].sort((a, b) => {
          const x = a[key];
          const y = b[key];
          const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
          return sort.desc ? -order : order;
        });
      }
      if (request !== latest.current) return;
      const start = query.pageIndex * query.pageSize;
      setRows(result.slice(start, start + query.pageSize));
      setTotal(result.length);
      setLoading(false);
    })();
  }, []);
  const serverSide = React.useMemo(() => ({ totalRecords: total, onQueryChange }), [total, onQueryChange]);

  const columns = React.useMemo<DataGridColumn<Installment>[]>(() => {
    const searchLines = async (query: string) => {
      setLineQueries((current) => [...current, query]);
      await delay(LATENCY_MS);
      const needle = plain(query);
      return lineOptions.filter((option) => !needle || plain(`${option.code} ${option.label}`).includes(needle));
    };
    return [
    { field: "selected", header: "Imputar", type: "checkbox", editable: true, filter: false, align: "center", width: 90 },
    selectColumn<Installment, { value: number; label: string }>("branch", "Sucursal", { options: branchOptions, editable: true, minWidth: 140 }),
    { field: "line", header: "Ramo", type: "lookup", editable: true, required: true, minWidth: 220, loadOptions: searchLines, lookupColumns: lineColumns, filter: false },
    textColumn<Installment>("policy", "Póliza", { editable: true, frozen: "left", minWidth: 140, editorProps: { maxLength: 12 } }),
    textColumn<Installment>("endorsement", "Endoso", {
      editable: true, minWidth: 100,
      onCommit: ({ row, value, grid }) => {
        // Equivale al onBlur de Endoso, que consulta las cuotas de la póliza.
        setConsults((current) => [...current, `${row.policy}/${String(value)}`]);
        grid.patchRow(row.id, { insured: `Consultado ${row.policy}/${String(value)}` });
      },
    }),
    textColumn<Installment>("insured", "Asegurado", { minWidth: 200, sortable: false }),
    amountColumn<Installment>("premium", "A aplicar"),
    amountColumn<Installment>("collected", "Imp. cobrado", {
      editable: true, minWidth: 130,
      onCommit: ({ row, value, grid }) => grid.patchRow(row.id, { net: netOf(row.premium, value, row.commission) }),
    }),
    amountColumn<Installment>("commission", "Com. desc.", {
      minWidth: 120,
      editable: (row) => row.collected !== null,
      onCommit: ({ row, value, grid }) => grid.patchRow(row.id, { net: netOf(row.premium, row.collected, value) }),
    }),
    amountColumn<Installment>("net", "Neto recaudar"),
    {
      field: "observations", header: "Stat", type: "custom", filter: false, sortable: false, align: "center", width: 90,
      render: ({ row }) => <Button size="sm" variant="ghost" aria-label={`Observaciones de ${row.policy}`} onClick={() => setObserved(row.policy)}>{row.observations ? "Obs." : "OK"}</Button>,
    },
    actionsColumn<Installment>([{ label: "Eliminar fila", icon: "×", onClick: (row) => ref.current?.removeRow(row.id) }]),
    ];
  }, []);

  const onChange = React.useCallback((data: DataGridData<Installment>, change: GridChange) => {
    setRows(data.rows);
    const changed = data.rows.find((row) => row.id === change.rowId);
    if (change.type === "remove" && change.rowId) db.current = db.current.filter((row) => row.id !== change.rowId);
    else if (change.type === "add" && changed) db.current = [changed, ...db.current];
    else if (changed) db.current = db.current.map((row) => (row.id === changed.id ? changed : row));
    setSaves((current) => current + 1);
  }, []);
  const addRow = React.useCallback(() => {
    const id = `nueva-${++nextNew.current}`;
    ref.current?.addRow({ id, selected: true, branch: null, line: null, policy: "", endorsement: "", insured: "", premium: 0, collected: null, commission: null, net: 0, observations: "" });
  }, []);

  return <div className="grid gap-4">
    <DataGrid ref={ref} columns={columns} value={rows} getRowId={installmentId} loading={loading} serverSide={serverSide}
      onChange={onChange} onAddRow={addRow} maxHeight="45vh" emptyState={{ title: "Sin cuotas cargadas", hint: "Use Agregar y capture sucursal, ramo y póliza." }}
      pagination={{ pageSize: 10, pageSizeOptions: [10, 25, 50] }} />
    <output aria-live="polite" aria-label="Estado del back" className="rounded border border-ui-border p-3 text-xs">
      <span data-testid="query-count">Consultas al servidor: {queries}</span>
      <br />
      <span data-testid="save-count">Cambios guardados: {saves}</span>
      <br />
      <span data-testid="consults">Consultas de cuotas: {consults.length ? consults.join(", ") : "ninguna"}</span>
      <br />
      <span data-testid="line-queries">Búsquedas de ramo: {lineQueries.length}{lineQueries.length ? ` (última «${lineQueries.at(-1)}»)` : ""}</span>
      <br />
      <span data-testid="observed">Observación abierta: {observed ?? "ninguna"}</span>
    </output>
  </div>;
}
export const PrimasPorCobrarCompleta: Story = {
  render: () => <PrimasCompletaExample />,
  parameters: { docs: { description: { story: "Reproduce la captura de Primas por cobrar sobre 500 cuotas en un servidor simulado (400 ms): paginación, orden y filtros en el servidor; casilla «Imputar», sucursal (select), ramo (columna `lookup` con modal), texto editable con `maxLength`, importes que recalculan «Neto» con `grid.patchRow`, comisión editable por fila, celda propia de estado, «Agregar» y eliminar fila (columna fija a la derecha). Endoso simula la consulta de cuotas al confirmar. Las ediciones confirmadas se guardan en el servidor simulado y sobreviven al cambio de página." } } },
};
