import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { PageShell } from "./PageShell";

const meta: Meta<typeof PageShell> = {
  title: "Layout/PageShell",
  component: PageShell,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PageShell>;

export const Default: Story = {
  args: {
    title: "Primas por cobrar",
    subtitle: "Gestión de cobranza y conciliación de cuotas",
    actions: (
      <>
        <Button variant="outline">Volver</Button>
        <Button>Guardar cambios</Button>
      </>
    ),
    children: (
      <div className="rounded-(--radius-ui-md) border border-ui-border p-4 text-sm">
        Área principal de contenido de la página.
      </div>
    ),
  },
};
