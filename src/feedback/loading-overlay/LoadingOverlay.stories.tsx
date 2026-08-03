import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingOverlay } from "./LoadingOverlay";

const meta: Meta<typeof LoadingOverlay> = {
  title: "Feedback/LoadingOverlay",
  component: LoadingOverlay,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Capa de carga sobre una región o sobre el viewport. `blocking` captura el puntero pero NO inertiza el fondo: para bloqueo real de la interacción, usa un diálogo modal.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof LoadingOverlay>;

// --- OverlayContainer -------------------------------------------------

export const OverlayContainer: Story = {
  render: () => (
    <div className="relative h-64 border border-ui-border rounded-lg bg-ui-muted p-4">
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-ui-foreground">
        <p>Contenido del contenedor</p>
        <p>(con `relative` posicionado)</p>
      </div>
      <LoadingOverlay open message="Cargando datos..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "El overlay se posiciona sobre su contenedor padre. El padre **debe tener `relative` u otra posición que no sea `static`**. Si no está posicionado, se emite una advertencia en desarrollo.",
      },
    },
  },
};

// --- OverlayViewport -------------------------------------------------

export const OverlayViewport: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ui-foreground/60">
        Abre el overlay sobre todo el viewport con `target="viewport"`:
      </p>
      <LoadingOverlay open target="viewport" message="Cargando en viewport" />
    </div>
  ),
};

// --- Blocking -------------------------------------------------

export const Blocking: Story = {
  render: () => (
    <div className="relative h-64 border border-ui-border rounded-lg bg-ui-muted p-4">
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-md bg-ui-primary px-3 py-2 text-sm text-ui-background transition-colors hover:bg-ui-primary/90"
        >
          Botón en el fondo
        </button>
        <p className="text-sm text-ui-foreground">
          (Con `blocking`, el puntero está capturado)
        </p>
      </div>
      <LoadingOverlay open blocking message="Bloqueado" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Con `blocking`, el overlay captura eventos de puntero (`pointer-events: auto`) sobre el área cubierta y marca `aria-busy`. Sin él, el puntero atraviesa (`pointer-events: none`).",
      },
    },
  },
};

// --- WithoutMessage -------------------------------------------------

export const WithoutMessage: Story = {
  render: () => (
    <div className="relative h-64 border border-ui-border rounded-lg bg-ui-muted p-4">
      <LoadingOverlay open />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "El overlay muestra solo el spinner sin mensaje.",
      },
    },
  },
};

// --- CustomClasses -------------------------------------------------

export const CustomClasses: Story = {
  render: () => (
    <div className="relative h-64 border border-ui-border rounded-lg bg-ui-muted p-4">
      <LoadingOverlay
        open
        message="Personalizado"
        classNames={{
          backdrop: "bg-red-500/20",
          panel: "bg-red-50 border border-red-200",
          message: "text-red-900",
        }}
      />
    </div>
  ),
};

// --- Unstyled -------------------------------------------------

export const Unstyled: Story = {
  render: () => (
    <div className="relative h-64 border border-ui-border rounded-lg bg-ui-muted p-4">
      <LoadingOverlay
        open
        unstyled
        className="flex items-center justify-center bg-blue-500/30"
        message="Sin estilos base"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Con `unstyled`, se omiten todas las clases base. Solo se aplican `className` y los estilos personalizados.",
      },
    },
  },
};
