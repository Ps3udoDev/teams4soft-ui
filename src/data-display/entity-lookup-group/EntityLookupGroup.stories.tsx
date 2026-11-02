import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityLookupGroup } from "./EntityLookupGroup";
import type { LookupGroupField } from "./EntityLookupGroup.types";
import type { LookupSearchContext, LookupSearchResponse } from "../lookup-core/lookup-core.types";
import { Selected, paginate, people, personColumns, personId, plain, wait, type Person } from "../entity-lookup-field/lookup-story-data";

const meta = {
  title: "Data display/EntityLookupGroup",
  component: EntityLookupGroup as unknown as React.ComponentType,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Buscador de catálogo con varios campos: cada campo manda su propio parámetro al back y el botón «…» va en uno solo. El componente es controlado (`values` + `onValuesChange`). Los ejemplos usan un back simulado en memoria con 300 ms de latencia que registra los parámetros recibidos." } },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Call = { params: Record<string, string>; page: number; pageSize: number };

/** Los parámetros específicos se comparan por prefijo; `search` (término genérico) por contenido. */
function searchPeople(params: Record<string, string>, ctx: LookupSearchContext): Promise<LookupSearchResponse<Person>> {
  return wait(ctx.signal).then((alive) => {
    if (!alive) return null;
    const starts = (value: string, needle: string | undefined) => !needle || plain(value).startsWith(plain(needle));
    const rows = people.filter((person) => starts(person.lastName, params.apellidoPaterno) && starts(person.motherLastName, params.apellidoMaterno)
      && starts(person.firstName, params.nombre) && (!params.search || plain(`${person.lastName} ${person.motherLastName} ${person.firstName}`).includes(plain(params.search))));
    return paginate(rows, ctx);
  });
}

const personFields: LookupGroupField[] = [
  { key: "lastName", param: "apellidoPaterno", label: "Apellido paterno", selectField: "lastName", clearable: true },
  { key: "motherLastName", param: "apellidoMaterno", label: "Apellido materno", selectField: "motherLastName", clearable: true },
  { key: "firstName", param: "nombre", label: "Nombre", selectField: "firstName", clearable: true },
];
const empty = { lastName: "", motherLastName: "", firstName: "" };

function GroupDemo({ fields, gridColumns }: { fields: LookupGroupField[]; gridColumns?: 1 | 2 | 3 | 4 }) {
  const [values, setValues] = React.useState<Record<string, string>>(empty);
  const [selected, setSelected] = React.useState<Person | null>(null);
  const [calls, setCalls] = React.useState<Call[]>([]);
  const [changes, setChanges] = React.useState(0);
  const search = React.useCallback((params: Record<string, string>, ctx: LookupSearchContext) => {
    setCalls((current) => [...current, { params, page: ctx.page, pageSize: ctx.pageSize }]);
    return searchPeople(params, ctx);
  }, []);
  const last = calls.at(-1);
  return <div className="grid gap-3">
    <EntityLookupGroup<Person> fields={fields} gridColumns={gridColumns} values={values}
      onValuesChange={(next) => { setValues(next); setChanges((current) => current + 1); }}
      search={search} onSelectionChange={setSelected} getItemId={personId} columns={personColumns} dialogTitle="Buscar persona" />
    <Selected item={selected} />
    <output aria-label="Consultas al back" className="block rounded border border-ui-border p-3 text-xs">
      <span data-testid="back-count">Consultas al back: {calls.length}</span>
      <br />
      <span data-testid="back-params">Parámetros: {last ? JSON.stringify(last.params) : "ninguno"}</span>
      <br />
      <span data-testid="back-ctx">Página: {last ? `${last.page} · tamaño ${last.pageSize}` : "—"}</span>
      <br />
      <span data-testid="values-changes">Llamadas a onValuesChange: {changes}</span>
    </output>
  </div>;
}

export const Persona: Story = {
  render: () => <GroupDemo fields={personFields} gridColumns={3} />,
  parameters: { docs: { description: { story: "Escribe «Fuentes» en Apellido paterno y pulsa Enter: el back recibe `apellidoPaterno` y nunca el texto en otro parámetro. Al elegir una fila se llenan los tres campos con una sola llamada a `onValuesChange`." } } },
};

const layoutFields: LookupGroupField[] = [
  { key: "lastName", param: "apellidoPaterno", label: "Apellido paterno", selectField: "lastName", col: 1, row: 1 },
  { key: "motherLastName", param: "apellidoMaterno", label: "Apellido materno", selectField: "motherLastName", col: 2, row: 1 },
  { key: "firstName", param: "nombre", label: "Nombre", selectField: "firstName", col: 1, row: 2, colSpan: 2 },
];
export const Layout2Columnas: Story = {
  render: () => <GroupDemo fields={layoutFields} gridColumns={2} />,
  parameters: { docs: { description: { story: "`gridColumns={2}` con posición explícita (`col`, `row`, `colSpan`). Por debajo de `md` los campos ocupan una sola columna." } } },
};
