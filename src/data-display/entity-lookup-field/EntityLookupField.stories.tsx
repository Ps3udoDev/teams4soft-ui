import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { Dialog } from "../../overlays";
import { TextField } from "../../forms";
import { EntityLookupField } from "./EntityLookupField";
import type { EntityFormContext, EntityLookupFieldProps } from "./EntityLookupField.types";
import {
  BackLog, Selected, createPeopleSearch, people, personColumns, personId, personLabel, useBackLog,
  type Person,
} from "./lookup-story-data";

const meta = {
  title: "Data display/EntityLookupField",
  component: EntityLookupField as unknown as React.ComponentType,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Campo de texto con botón «…» que busca registros (en una lista local o en el back) y los muestra en un modal con tabla. El padre debe aplicar `onSelectionChange` para actualizar `selectedItem`. La librería no hace HTTP: los ejemplos usan un back simulado en memoria con 300 ms de latencia." } },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const localItems = people.slice(0, 15);
const base = { getItemId: personId, getItemLabel: personLabel, columns: personColumns } as const;

function Demo({ children, ...props }: Partial<EntityLookupFieldProps<Person>> & { children?: React.ReactNode }) {
  const [selected, setSelected] = React.useState<Person | null>(null);
  return <div className="grid max-w-xl gap-3">
    <EntityLookupField<Person> {...base} label="Persona" selectedItem={selected} onSelectionChange={setSelected} clearable {...props} />
    <Selected item={selected} />
    {children}
  </div>;
}

export const Local: Story = {
  render: () => <Demo items={localItems} />,
  parameters: { docs: { description: { story: "Sin `search`: Enter o «…» con texto abren el modal con las 15 filas filtradas por el texto (sin mayúsculas ni tildes). Con una sola coincidencia el modal igual se abre, para confirmar." } } },
};

function RemoteExample() {
  const { calls, log } = useBackLog();
  const search = React.useMemo(() => createPeopleSearch(log), [log]);
  return <Demo search={search} dialogTitle="Buscar persona" placeholder="Código o nombre">
    <BackLog calls={calls} />
  </Demo>;
}
export const RemotoPaginacionServidor: Story = {
  render: () => <RemoteExample />,
  parameters: { docs: { description: { story: "500 registros. Escribe «garcia» y pulsa Enter (varias coincidencias, modal), «P0007» (una sola: se selecciona sin modal) o «zzz» (ninguna). Cada cambio de página manda una sola consulta con el mismo término. El registro de consultas muestra lo que recibió el back." } } },
};

const criteria = [{ value: "code", label: "Por código" }, { value: "lastName", label: "Por apellido paterno" }];
function CriteriaExample() {
  const { calls, log } = useBackLog();
  const search = React.useMemo(() => createPeopleSearch(log), [log]);
  return <Demo search={search} criteria={criteria} placeholder="Texto a buscar">
    <BackLog calls={calls} />
  </Demo>;
}
export const ConCriterios: Story = {
  render: () => <CriteriaExample />,
  parameters: { docs: { description: { story: "El botón «…» abre un menú con los criterios. Elegir uno lo fija y busca con el texto capturado; Enter y la paginación conservan `criterion`." } } },
};

function ResolveOnBlurExample() {
  const [notFound, setNotFound] = React.useState<string | null>(null);
  const { calls, log } = useBackLog();
  const search = React.useMemo(() => createPeopleSearch(log), [log]);
  return <div className="grid max-w-xl gap-6">
    <Demo label="Local" items={localItems} resolveOnBlur onResolveNotFound={setNotFound} placeholder="Nombre completo o parte" />
    <Demo label="Remoto" search={search} resolveOnBlur placeholder="Código o nombre"><BackLog calls={calls} /></Demo>
    <output aria-label="Sin coincidencia" className="block text-xs">Sin coincidencia en local: {notFound ?? "ninguna"}</output>
    <Button variant="outline">Otro control (para salir del campo)</Button>
  </div>;
}
export const ResolverAlSalir: Story = {
  render: () => <ResolveOnBlurExample />,
  parameters: { docs: { description: { story: "Escribe y sal del campo sin Tab ni Enter. Local: una coincidencia selecciona, varias abren el modal y ninguna limpia y llama `onResolveNotFound`. Remoto: Tab busca y el blur siguiente no repite la consulta." } } },
};

function PersonForm({ ctx, nextId }: { ctx: EntityFormContext<Person>; nextId: () => number }) {
  const [code, setCode] = React.useState(ctx.item?.code ?? "");
  const [firstName, setFirstName] = React.useState(ctx.item?.firstName ?? "");
  const [lastName, setLastName] = React.useState(ctx.item?.lastName ?? "");
  const view = ctx.mode === "view";
  return <Dialog open={ctx.open} onOpenChange={(open) => { if (!open) ctx.onClose(); }} size="sm"
    title={view ? "Consultar persona" : "Nueva persona"}
    footer={<>
      <Button variant="outline" onClick={ctx.onClose}>{view ? "Cerrar" : "Cancelar"}</Button>
      {!view && <Button onClick={() => ctx.onSaved({ id: nextId(), code, firstName, lastName, motherLastName: "", city: "Quito" })}>Guardar</Button>}
    </>}>
    <div className="grid gap-3">
      <TextField aria-label="Código" placeholder="Código" value={code} onValueChange={setCode} readOnly={view} />
      <TextField aria-label="Nombre" placeholder="Nombre" value={firstName} onValueChange={setFirstName} readOnly={view} />
      <TextField aria-label="Apellido paterno" placeholder="Apellido paterno" value={lastName} onValueChange={setLastName} readOnly={view} />
    </div>
  </Dialog>;
}

function EntityFormExample() {
  const [items, setItems] = React.useState<Person[]>(() => people.slice(0, 15));
  const counter = React.useRef(1000);
  const nextId = React.useCallback(() => ++counter.current, []);
  const [selected, setSelected] = React.useState<Person | null>(null);
  const renderEntityForm = React.useCallback((ctx: EntityFormContext<Person>) => (
    <PersonForm key={`${ctx.mode}-${ctx.item?.id ?? "new"}`} ctx={{ ...ctx, onSaved: (item) => { setItems((current) => [...current, item]); ctx.onSaved(item); } }} nextId={nextId} />
  ), [nextId]);
  return <div className="grid max-w-xl gap-3">
    <EntityLookupField<Person> {...base} label="Persona" items={items} selectedItem={selected} onSelectionChange={setSelected} clearable renderEntityForm={renderEntityForm} />
    <Selected item={selected} />
  </div>;
}
export const AltaConsultaDesdeElModal: Story = {
  render: () => <EntityFormExample />,
  parameters: { docs: { description: { story: "Con `renderEntityForm` el pie del modal ofrece «Nuevo» (sin fila marcada) o «Consultar» (con fila marcada o selección previa). El formulario se abre encima del modal; Escape cierra solo el formulario. `onSaved` selecciona el item y cierra ambos diálogos, y el foco vuelve al campo." } } },
};

function NotFoundExample() {
  const [requested, setRequested] = React.useState<string | null>(null);
  const searchA = React.useMemo(() => createPeopleSearch(() => {}), []);
  const searchB = React.useMemo(() => createPeopleSearch(() => {}), []);
  return <div className="grid max-w-xl gap-6">
    <Demo label="Sin alta" search={searchA} placeholder="Prueba «zzz» o «bloqueado»" />
    <Demo label="Con alta" search={searchB} onCreateRequest={setRequested} placeholder="Prueba «zzz»" />
    <output aria-label="Alta solicitada" data-testid="create-request" className="block text-xs">Alta solicitada: {requested ?? "ninguna"}</output>
  </div>;
}
export const SinResultados: Story = {
  render: () => <NotFoundExample />,
  parameters: { docs: { description: { story: "Sin `onCreateRequest` el aviso informa y, al aceptar, limpia el campo. Con `onCreateRequest` pregunta si se desea crear y, al aceptar, llama `onCreateRequest(texto)` y deja el texto. «bloqueado» devuelve `emptyMessage`: aviso informativo que no cambia nada." } } },
};

function OwnTriggerExample() {
  const [clicks, setClicks] = React.useState(0);
  return <Demo items={localItems} onTriggerClick={() => setClicks((current) => current + 1)}
    triggerIcon={<svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h12" /></svg>}
    trailingActions={<Button variant="outline" size="sm">Nuevo</Button>}>
    <output aria-label="Clics" data-testid="trigger-clicks" className="block text-xs">Acción propia ejecutada: {clicks}</output>
  </Demo>;
}
export const BotonPropio: Story = {
  render: () => <OwnTriggerExample />,
  parameters: { docs: { description: { story: "Con `onTriggerClick`, el botón y Enter ejecutan la acción del padre en vez de buscar; Tab y salir del campo no buscan. `triggerIcon` cambia el icono y `trailingActions` añade controles tras el botón." } } },
};

function InDialogExample() {
  const [open, setOpen] = React.useState(true);
  const { calls, log } = useBackLog();
  const search = React.useMemo(() => createPeopleSearch(log), [log]);
  return <>
    <Button onClick={() => setOpen(true)}>Abrir captura</Button>
    <Dialog open={open} onOpenChange={setOpen} title="Captura de póliza" size="md">
      <Demo search={search} criteria={criteria} placeholder="Texto a buscar"><BackLog calls={calls} /></Demo>
    </Dialog>
  </>;
}
export const ConCriteriosEnDialog: Story = {
  render: () => <InDialogExample />,
  parameters: { docs: { description: { story: "El campo dentro de un `Dialog`: el menú de criterios, el modal de resultados y el formulario se apilan por encima del diálogo contenedor." } } },
};
