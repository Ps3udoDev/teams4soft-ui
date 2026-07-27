import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField";
import { FormField } from "../form-field/FormField";
import type { TextFieldSize } from "./TextField.types";

const SIZES: TextFieldSize[] = ["sm", "md", "lg"];

function IconSearch() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconMail() {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

const meta: Meta<typeof TextField> = {
  title: "Forms/TextField",
  component: TextField,
  tags: ["autodocs"],
  args: {
    placeholder: "nombre@empresa.com",
    "aria-label": "Correo",
  },
  render: (args) => (
    <div className="w-80">
      <TextField {...args} />
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-3">
      {SIZES.map((size) => (
        <TextField key={size} {...args} size={size} placeholder={size} />
      ))}
    </div>
  ),
};

export const LeadingAndTrailing: Story = {
  args: {
    leading: <IconSearch />,
    trailing: <IconMail />,
    placeholder: "Buscar...",
  },
};

export const Clearable: Story = {
  render: (args) => {
    const [value, setValue] = React.useState("Texto de ejemplo");
    return (
      <div className="w-80">
        <TextField {...args} value={value} onValueChange={setValue} clearable />
      </div>
    );
  },
};

export const Password: Story = {
  args: {
    type: "password",
    defaultValue: "secreto123",
    revealPassword: true,
    "aria-label": "Contraseña",
    autoComplete: "current-password",
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    defaultValue: "Guardando...",
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    defaultValue: "Solo lectura",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "No disponible",
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
    defaultValue: "correo-invalido",
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = React.useState("");
    return (
      <div className="flex w-80 flex-col gap-2">
        <TextField {...args} value={value} onValueChange={setValue} />
        <p className="text-sm text-ui-foreground/60">Valor: {value || "(vacío)"}</p>
      </div>
    );
  },
};

export const Uncontrolled: Story = {
  args: {
    defaultValue: "Valor inicial",
  },
};

export const CustomClasses: Story = {
  args: {
    defaultValue: "Texto con estilos custom",
    clearable: true,
    className: "rounded-full border-cyan-700",
    classNames: {
      input: "font-mono text-cyan-950",
      clearButton: "hover:bg-cyan-100",
    },
  },
};

export const Unstyled: Story = {
  args: {
    unstyled: true,
    clearable: true,
    defaultValue: "Sin estilos por defecto",
    className:
      "border border-dashed border-ui-border px-2 py-1 text-sm text-ui-foreground",
  },
};

export const WithFormField: Story = {
  render: () => {
    const [value, setValue] = React.useState("");
    return (
      <div className="w-80">
        <FormField
          label="Usuario"
          required
          description="Usaremos este dato para tu inicio de sesión."
        >
          <TextField
            value={value}
            onValueChange={setValue}
            autoComplete="username"
            clearable
          />
        </FormField>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "El id y los atributos ARIA (aria-required, aria-describedby) se resuelven automáticamente vía el contexto de FormField.",
      },
    },
  },
};
