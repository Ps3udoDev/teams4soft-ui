import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives";
import { LoadingOverlay } from "../loading-overlay/LoadingOverlay";
import { FileGenerationIndicator } from "./FileGenerationIndicator";
import type { FileGenerationFormat } from "./FileGenerationIndicator.types";

const meta: Meta<typeof FileGenerationIndicator> = {
  title: "Feedback/FileGenerationIndicator",
  component: FileGenerationIndicator,
  tags: ["autodocs"],
  args: { format: "xlsx", size: "md" },
  parameters: {
    docs: {
      description: {
        component:
          "Indicador decorativo por formato (`xlsx`, `docx`, `pdf`, `file`) que compone `Spinner` con animación CSS respetuosa con `prefers-reduced-motion`. Lleva `aria-hidden=\"true\"`; el contenedor (`LoadingOverlay` o `LoadingProvider`) emite el único `role=\"status\"`.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FileGenerationIndicator>;

export const Excel: Story = { args: { format: "xlsx", size: "md" } };

const variants: Array<{ format: FileGenerationFormat; label: string }> = [
  { format: "xlsx", label: "Generando Excel…" },
  { format: "docx", label: "Generando documento…" },
  { format: "pdf", label: "Generando PDF…" },
  { format: "file", label: "Preparando archivo…" },
];

export const TodasLasVariantes: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-4 sm:grid-cols-4">
        {variants.map((item) => (
          <div key={item.format} className="flex flex-col items-center gap-2 text-center">
            <FileGenerationIndicator format={item.format} size="md" />
            <span className="text-xs font-medium">{item.format.toUpperCase()}</span>
            <span className="text-xs text-ui-foreground/70">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {variants.map((item) => (
          <FileGenerationIndicator key={item.format} format={item.format} size="sm" />
        ))}
      </div>
    </div>
  ),
};

function OverlayRegionExample() {
  const [pending, setPending] = React.useState(true);
  const [format, setFormat] = React.useState<FileGenerationFormat>("xlsx");
  const message = variants.find((v) => v.format === format)?.label ?? "Preparando archivo…";
  return (
    <div className="grid max-w-lg gap-3">
      <div className="flex flex-wrap gap-2">
        {variants.map((item) => (
          <Button
            key={item.format}
            variant={format === item.format ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setFormat(item.format);
              setPending(true);
            }}
          >
            {item.format.toUpperCase()}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPending((v) => !v)}>
          {pending ? "Finalizar" : "Reanudar"}
        </Button>
      </div>
      <div className="relative flex h-40 items-center justify-center rounded-(--radius-ui-md) border border-ui-border p-4">
        <p className="text-sm text-ui-foreground/70">Región confinada de consulta / reporte</p>
        <LoadingOverlay
          open={pending}
          target="container"
          message={message}
          indicator={<FileGenerationIndicator format={format} />}
        />
      </div>
    </div>
  );
}

export const ConLoadingOverlay: Story = {
  render: () => <OverlayRegionExample />,
  parameters: {
    docs: {
      description: {
        story:
          "Composición recomendada: `<LoadingOverlay open={pending} message=\"Generando Excel…\" indicator={<FileGenerationIndicator format=\"xlsx\" />} />`. En Docs la capa queda confinada a su región.",
      },
    },
  },
};

function ViewportExample() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex gap-2">
      <Button onClick={() => setOpen(true)}>Simular exportación a pantalla completa</Button>
      {open ? (
        <div className="fixed right-4 bottom-4 z-[60]">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancelar simulación
          </Button>
        </div>
      ) : null}
      <LoadingOverlay
        open={open}
        blocking
        target="viewport"
        message="Generando Excel…"
        indicator={<FileGenerationIndicator format="xlsx" />}
      />
    </div>
  );
}

export const VarianteViewport: Story = {
  render: () => <ViewportExample />,
  parameters: {
    docs: {
      description: {
        story: "La variante `target=\"viewport\"` inicia cerrada y se abre únicamente al pulsar el botón.",
      },
    },
  },
};
