import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives/button/Button";
import { FeedbackDialog } from "./FeedbackDialog";
import type { FeedbackDialogProps } from "./FeedbackDialog.types";

function Example(args: FeedbackDialogProps) {
  const [open, setOpen] = React.useState(args.open);
  React.useEffect(() => { setOpen(args.open); }, [args.open]);
  return <><Button onClick={() => setOpen(true)}>Abrir aviso</Button><FeedbackDialog {...args} open={open} onOpenChange={setOpen} /></>;
}

const meta = {
  title: "Overlays/FeedbackDialog",
  component: FeedbackDialog,
  render: (args) => <Example {...args} />,
  args: { open: true, message: "¿Desea continuar con la operación?", showReject: true },
  tags: ["autodocs"],
} satisfies Meta<typeof FeedbackDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmacion: Story = {};
export const Peligro: Story = { args: { severity: "danger", title: "Eliminar registro", message: "Esta acción elimina el registro seleccionado.", acceptLabel: "Eliminar" } };
export const Informacion: Story = { args: { severity: "info", showReject: false, message: "Hay nueva información disponible." } };
export const Exito: Story = { args: { severity: "success", variant: "notice", showReject: false, message: "Los cambios se guardaron correctamente.\nPuede continuar trabajando." } };
export const Error: Story = { args: { severity: "error", variant: "notice", showReject: false, title: "Error al guardar", message: "No se pudo completar la operación.\nRevise los datos e inténtelo de nuevo." } };
export const AceptacionAsincrona: Story = { args: { title: "Guardar cambios", onAccept: () => new Promise<void>((resolve) => setTimeout(resolve, 1500)) } };
