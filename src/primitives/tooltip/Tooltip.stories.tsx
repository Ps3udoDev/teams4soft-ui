import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip, TooltipProvider } from "./Tooltip";
import type { TooltipSide } from "./Tooltip.types";
import { Button } from "../button/Button";

function IconDownload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
    </svg>
  );
}

const meta: Meta<typeof Tooltip> = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-40 items-center justify-center p-16">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  args: {
    content: "Exportar reporte",
  },
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Sides: Story = {
  render: () => {
    const sides: TooltipSide[] = ["top", "right", "bottom", "left"];
    return (
      <div className="flex flex-wrap items-center gap-8">
        {sides.map((side) => (
          <Tooltip key={side} content={`Lado: ${side}`} side={side}>
            <Button variant="secondary">{side}</Button>
          </Tooltip>
        ))}
      </div>
    );
  },
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = React.useState(false);
    return (
      <div className="flex flex-col items-center gap-4">
        <Tooltip content="Tooltip controlado" open={open} onOpenChange={setOpen}>
          <Button variant="secondary">Trigger</Button>
        </Tooltip>
        <Button size="sm" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Cerrar" : "Abrir"} desde fuera
        </Button>
      </div>
    );
  },
};

export const LongContent: Story = {
  args: {
    content:
      "Este contenido es intencionalmente largo para verificar que el tooltip mantiene un ancho máximo legible y hace wrap del texto en varias líneas sin desbordar el viewport.",
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="secondary">Contenido largo</Button>
    </Tooltip>
  ),
};

export const CustomClasses: Story = {
  args: {
    content: "Copiar",
    classNames: {
      content: "rounded-none bg-fuchsia-950 text-fuchsia-50",
      arrow: "fill-fuchsia-950",
    },
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="secondary">Copiar</Button>
    </Tooltip>
  ),
};

export const Unstyled: Story = {
  args: {
    unstyled: true,
    content: "Sin estilos por defecto",
    className: "border border-dashed border-ui-border bg-ui-background px-2 py-1 text-xs text-ui-foreground",
  },
  render: (args) => (
    <Tooltip {...args}>
      <Button variant="secondary">Sin estilos</Button>
    </Tooltip>
  ),
};

export const Keyboard: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Tooltip content="Primero (Tab para enfocar)">
        <Button variant="secondary">Primero</Button>
      </Tooltip>
      <Tooltip content="Segundo — Escape cierra">
        <Button variant="secondary">Segundo</Button>
      </Tooltip>
      <Tooltip content="Tercero">
        <Button variant="secondary">Tercero</Button>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Navega con Tab para abrir cada tooltip por foco; Escape lo cierra sin mover el foco del trigger.",
      },
    },
  },
};

export const Collision: Story = {
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={0}>
        <div className="flex h-64 w-full items-start justify-end overflow-auto border border-dashed border-ui-border p-2">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  render: () => (
    <Tooltip content="Este tooltip cambia de lado si no cabe en el viewport" side="right">
      <Button size="icon" aria-label="Exportar reporte">
        <IconDownload />
      </Button>
    </Tooltip>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "El trigger está pegado al borde del contenedor: Radix aplica collision detection y reposiciona el content automáticamente.",
      },
    },
  },
};
