import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Marcador de posición decorativo mientras carga el contenido.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

// --- SkeletonShapes -------------------------------------------------

export const SkeletonShapes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton shape="text" />
        <span className="text-xs text-ui-muted">text</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton shape="rect" width={100} height={60} />
        <span className="text-xs text-ui-muted">rect</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Skeleton shape="circle" width={60} height={60} />
        <span className="text-xs text-ui-muted">circle</span>
      </div>
    </div>
  ),
};

// --- TextLines -------------------------------------------------

export const TextLines: Story = {
  render: () => <Skeleton lines={4} />,
};

// --- CardPlaceholder -------------------------------------------------

export const CardPlaceholder: Story = {
  render: () => (
    <div className="w-80 rounded-lg border border-ui-border p-4">
      <Skeleton shape="rect" width={120} height={120} className="rounded-md" />
      <div className="mt-4 space-y-3">
        <Skeleton lines={2} />
        <Skeleton shape="rect" width={80} height={28} />
      </div>
    </div>
  ),
};

// --- NoAnimation -------------------------------------------------

export const NoAnimation: Story = {
  render: () => <Skeleton animation="none" />,
};

// --- CustomClasses -------------------------------------------------

export const CustomClasses: Story = {
  render: () => <Skeleton className="h-12 w-64 rounded-lg bg-ui-primary/20" />,
};

// --- Unstyled -------------------------------------------------

export const Unstyled: Story = {
  render: () => (
    <Skeleton unstyled className="h-4 w-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300" />
  ),
};

// --- ReducedMotion -------------------------------------------------

export const ReducedMotion: Story = {
  render: () => <Skeleton />,
  parameters: {
    docs: {
      description: {
        story:
          "La animación se suprime automáticamente con `prefers-reduced-motion` usando la clase `motion-safe:animate-pulse`.",
      },
    },
  },
};
