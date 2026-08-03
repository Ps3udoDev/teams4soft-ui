import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Indicador de actividad indeterminada. Usa `label` cuando comunique carga y `decorative` cuando acompañe a un texto que ya la anuncia.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Spinner>;

// --- SpinnerSizes -------------------------------------------------

export const SpinnerSizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="xs" />
        <span className="text-xs text-ui-muted">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="sm" />
        <span className="text-xs text-ui-muted">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" />
        <span className="text-xs text-ui-muted">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <span className="text-xs text-ui-muted">lg</span>
      </div>
    </div>
  ),
};

// --- WithLabel -------------------------------------------------

export const WithLabel: Story = {
  render: () => <Spinner label="Cargando datos" />,
};

// --- Decorative -------------------------------------------------

export const Decorative: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner decorative size="sm" />
      <span>Procesando tu solicitud...</span>
    </div>
  ),
};

// --- CustomClasses -------------------------------------------------

export const CustomClasses: Story = {
  render: () => <Spinner className="text-ui-primary" />,
};

// --- Unstyled -------------------------------------------------

export const Unstyled: Story = {
  render: () => (
    <Spinner
      unstyled
      className="inline-flex h-6 w-6 items-center justify-center border-2 border-dashed border-ui-border"
    />
  ),
};

// --- ReducedMotion -------------------------------------------------

export const ReducedMotion: Story = {
  render: () => <Spinner />,
  parameters: {
    docs: {
      description: {
        story:
          "La animación se suprime automáticamente con `prefers-reduced-motion` usando la clase `motion-safe:animate-spin`.",
      },
    },
  },
};
