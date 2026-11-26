import type { Meta, StoryObj } from "@storybook/react-vite";
import { InlineMessage } from "./InlineMessage";

const meta: Meta<typeof InlineMessage> = {
  title: "Feedback/InlineMessage",
  component: InlineMessage,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InlineMessage>;

export const Tones: Story = {
  render: () => (
    <div className="grid gap-2">
      <InlineMessage tone="info">Los cambios se aplicarán al cierre mensual.</InlineMessage>
      <InlineMessage tone="success">Archivo validado correctamente.</InlineMessage>
      <InlineMessage tone="warning">Existen cuotas pendientes de conciliación.</InlineMessage>
      <InlineMessage tone="danger">El importe cobrado no puede superar el total.</InlineMessage>
    </div>
  ),
};
