import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { Dialog } from "../../overlays";
import { DataGrid } from "./DataGrid";
import { amountColumn, dateColumn, selectColumn, textColumn } from "./column-factories";
import type { DataGridColumn, DataGridData, DataGridHandle } from "./DataGrid.types";
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

// ---- Edición (G2) ----------------------------------------------------------
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
