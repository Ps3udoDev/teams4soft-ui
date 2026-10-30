import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { DataGrid } from "./DataGrid";
import { amountColumn, dateColumn, selectColumn, textColumn } from "./column-factories";
import type { DataGridColumn } from "./DataGrid.types";

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
    docs: { description: { component: "Tabla de consulta con orden, filtros por columna, selección por id y paginación local. Las columnas deben conservar una identidad estable." } },
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
  parameters: { docs: { description: { story: "Busca «perez» para comprobar la coincidencia sin diacríticos. Estado filtra por el valor de la opción, mostrando su etiqueta." } } },
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
