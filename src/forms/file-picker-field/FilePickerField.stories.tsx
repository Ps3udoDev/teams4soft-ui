import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilePickerField } from "./FilePickerField";

const meta: Meta<typeof FilePickerField> = {
  title: "Forms/FilePickerField",
  component: FilePickerField,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FilePickerField>;

export const Default: Story = {
  render: () => {
    const [file, setFile] = React.useState<File | null>(null);
    return (
      <FilePickerField
        label="Archivo de conciliación"
        description="Formatos admitidos: .xlsx o .csv (máximo 5 MB)"
        accept=".xlsx,.csv"
        maxSizeBytes={5 * 1024 * 1024}
        value={file}
        onValueChange={setFile}
      />
    );
  },
};

export const WithError: Story = {
  args: {
    label: "Soporte obligatorio",
    errorMessage: "Seleccione un archivo antes de importar.",
    required: true,
  },
};
