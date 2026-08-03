import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./Progress";

const meta: Meta<typeof Progress> = {
  title: "Feedback/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Barra de progreso. Sin `value` representa progreso indeterminado y, tal como exige ARIA, omite `aria-valuenow` en lugar de fingir un cero.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Progress>;

// --- ProgressDeterminate -------------------------------------------------

export const ProgressDeterminate: Story = {
  render: () => <Progress value={65} label="Descargando" />,
};

// --- ProgressIndeterminate -------------------------------------------------

export const ProgressIndeterminate: Story = {
  render: () => <Progress label="Cargando" />,
};

// --- Tones -------------------------------------------------

export const Tones: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">primary</span>
        <Progress value={60} tone="primary" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">success</span>
        <Progress value={60} tone="success" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">warning</span>
        <Progress value={60} tone="warning" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">danger</span>
        <Progress value={60} tone="danger" />
      </div>
    </div>
  ),
};

// --- Sizes -------------------------------------------------

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">sm</span>
        <Progress value={60} size="sm" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">md</span>
        <Progress value={60} size="md" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ui-muted">lg</span>
        <Progress value={60} size="lg" />
      </div>
    </div>
  ),
};

// --- WithLabelAndValue -------------------------------------------------

export const WithLabelAndValue: Story = {
  render: () => <Progress value={75} max={100} label="Instalación" showValue />,
};

// --- CustomMax -------------------------------------------------

export const CustomMax: Story = {
  render: () => <Progress value={30} max={50} label="Progreso" showValue />,
};

// --- CustomClasses -------------------------------------------------

export const CustomClasses: Story = {
  render: () => (
    <Progress
      value={45}
      label="Personalizado"
      className="w-80"
      classNames={{
        track: "bg-ui-border",
        indicator: "bg-gradient-to-r from-ui-primary to-ui-danger",
      }}
    />
  ),
};

// --- Unstyled -------------------------------------------------

export const Unstyled: Story = {
  render: () => (
    <Progress
      value={50}
      unstyled
      className="w-80 rounded-lg border-2 border-solid border-ui-border p-2"
      classNames={{
        track: "h-4 rounded-md bg-ui-muted",
        indicator: "h-full rounded-md bg-ui-primary",
      }}
    />
  ),
};

// --- ReducedMotion -------------------------------------------------

export const ReducedMotion: Story = {
  render: () => <Progress label="Cargando" />,
  parameters: {
    docs: {
      description: {
        story:
          "En modo indeterminado, la animación se suprime automáticamente con `prefers-reduced-motion` usando `motion-safe:animate-pulse`.",
      },
    },
  },
};
