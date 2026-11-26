import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextareaField } from "./TextareaField";

const meta: Meta<typeof TextareaField> = {
  title: "Forms/TextareaField",
  component: TextareaField,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TextareaField>;

export const Default: Story = {
  render: () => {
    const [text, setText] = React.useState("");
    return (
      <TextareaField
        label="Observaciones"
        description="Detalle adicional del siniestro"
        placeholder="Escriba aquí..."
        value={text}
        onValueChange={setText}
      />
    );
  },
};

export const WithError: Story = {
  args: {
    label: "Motivo de rechazo",
    errorMessage: "Debe ingresar un motivo de al menos 10 caracteres.",
    defaultValue: "Corto",
    required: true,
  },
};
