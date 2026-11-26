import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContextMenu } from "./ContextMenu";

const meta: Meta<typeof ContextMenu> = {
  title: "Overlays/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {
  args: {
    triggerLabel: "Acciones de póliza",
    items: [
      { id: "view", label: "Consultar", onSelect: () => {} },
      { id: "edit", label: "Editar", onSelect: () => {} },
      { id: "delete", label: "Eliminar", tone: "danger", onSelect: () => {} },
    ],
  },
};
