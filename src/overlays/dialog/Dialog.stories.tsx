import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives/button/Button";
import { Dialog } from "./Dialog";
import type { DialogProps, DialogSize } from "./Dialog.types";

const meta: Meta<typeof Dialog> = {
  title: "Overlays/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  args: { open: true, title: "Buscar cliente", children: <div className="p-4">Selecciona un cliente para continuar.</div> },
};
export default meta;
type Story = StoryObj<typeof Dialog>;

function Interactive(args: DialogProps) {
  const [open, setOpen] = React.useState(args.open);
  return <><Button onClick={() => setOpen(true)}>Abrir diálogo</Button><Dialog {...args} open={open} onOpenChange={setOpen} /></>;
}

export const Basico: Story = { render: (args) => <Interactive {...args} /> };

export const Tamanos: Story = {
  render: () => {
    const [size, setSize] = React.useState<DialogSize>("md");
    const [open, setOpen] = React.useState(true);
    return <><Button onClick={() => setOpen(true)}>Ver tamaños</Button><Dialog open={open} onOpenChange={setOpen} size={size} title={`Tamaño ${size}`}><div className="flex flex-wrap gap-2 p-4">{(["sm", "md", "lg", "xl", "full"] as const).map((value) => <Button key={value} onClick={() => setSize(value)} variant={size === value ? "primary" : "outline"}>{value}</Button>)}</div></Dialog></>;
  },
};

export const ConPie: Story = {
  render: () => {
    const [open, setOpen] = React.useState(true);
    return <><Button onClick={() => setOpen(true)}>Editar cliente</Button><Dialog open={open} onOpenChange={setOpen} title="Editar cliente" description="Actualiza el nombre del cliente." footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => setOpen(false)}>Guardar</Button></div>}><div className="p-4"><label className="flex flex-col gap-2">Nombre<input className="rounded border border-ui-border p-2" defaultValue="María Pérez" /></label></div></Dialog></>;
  },
};

export const Anidado: Story = {
  render: () => {
    const [open, setOpen] = React.useState(true);
    const [create, setCreate] = React.useState(false);
    return <><Button onClick={() => setOpen(true)}>Buscar cliente</Button><Dialog open={open} onOpenChange={setOpen} title="Buscador de clientes"><div className="space-y-4 p-4"><p>No hay clientes registrados.</p><Button onClick={() => setCreate(true)}>Nuevo cliente</Button></div><Dialog open={create} onOpenChange={setCreate} title="Alta de cliente"><div className="p-4"><label className="flex flex-col gap-2">Nombre<input className="rounded border border-ui-border p-2" /></label></div></Dialog></Dialog></>;
  },
};

export const Cargando: Story = { args: { loading: true, loadingMessage: "Consultando clientes…", children: <div className="h-48 p-4">Resultados de la búsqueda</div> }, render: (args) => <Interactive {...args} /> };

export const Movil: Story = { globals: { viewport: { value: "mobile1", isRotated: false } }, render: (args) => <Interactive {...args} /> };
export const BottomSheet: Story = { args: { mobileVariant: "sheet" }, globals: { viewport: { value: "mobile1", isRotated: false } }, render: (args) => <Interactive {...args} /> };
