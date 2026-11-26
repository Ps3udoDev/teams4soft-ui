import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "Layout/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    defaultValue: "general",
    items: [
      { value: "general", label: "Datos generales", content: <p className="text-sm">Contenido de datos generales.</p> },
      { value: "coberturas", label: "Coberturas", content: <p className="text-sm">Lista de coberturas.</p> },
      { value: "historial", label: "Historial", content: <p className="text-sm">Movimientos del contrato.</p> },
    ],
  },
};
