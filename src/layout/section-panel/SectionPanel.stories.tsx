import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { SectionPanel } from "./SectionPanel";

const meta: Meta<typeof SectionPanel> = {
  title: "Layout/SectionPanel",
  component: SectionPanel,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SectionPanel>;

export const Default: Story = {
  args: {
    title: "Datos generales de la póliza",
    description: "Información principal del contrato",
    actions: <Button size="sm" variant="outline">Editar</Button>,
    children: <p className="text-sm">Contenido de la sección.</p>,
  },
};

export const Collapsible: Story = {
  render: () => {
    const [collapsed, setCollapsed] = React.useState(false);
    return (
      <SectionPanel
        title="Coberturas"
        description="Sección colapsable controlada"
        collapsible
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      >
        <p className="text-sm">Detalle de coberturas y deducibles.</p>
      </SectionPanel>
    );
  },
};
