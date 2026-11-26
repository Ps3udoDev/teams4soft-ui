import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusTag } from "./StatusTag";

const meta: Meta<typeof StatusTag> = {
  title: "Feedback/StatusTag",
  component: StatusTag,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StatusTag>;

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag tone="neutral">Borrador</StatusTag>
      <StatusTag tone="info">En revisión</StatusTag>
      <StatusTag tone="success">Liquidado</StatusTag>
      <StatusTag tone="warning">Por vencer</StatusTag>
      <StatusTag tone="danger">Anulado</StatusTag>
    </div>
  ),
};
