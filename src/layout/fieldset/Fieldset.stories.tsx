import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fieldset } from "./Fieldset";
import { RadioGroup } from "../../forms/radio-group/RadioGroup";
import { CheckboxField } from "../../forms/checkbox-field/CheckboxField";
import type { RadioOption } from "../../forms/radio-group/RadioGroup.types";

const personTypeOptions: RadioOption<"natural" | "juridica">[] = [
  { value: "natural", label: "Persona natural" },
  { value: "juridica", label: "Persona jurídica" },
];

const meta: Meta<typeof Fieldset> = {
  title: "Layout/Fieldset",
  component: Fieldset,
  tags: ["autodocs"],
  args: {
    legend: "Tipo de persona",
  },
  render: (args) => (
    <div className="w-96">
      <Fieldset {...args} />
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof Fieldset>;

export const Default: Story = {
  args: {
    children: (
      <>
        <input
          aria-label="Nombre"
          placeholder="Nombre"
          className="h-9 rounded-(--radius-ui-md) border border-ui-border px-3 text-sm"
        />
        <input
          aria-label="Apellido"
          placeholder="Apellido"
          className="h-9 rounded-(--radius-ui-md) border border-ui-border px-3 text-sm"
        />
      </>
    ),
  },
};

export const RadioGroupStory: Story = {
  name: "RadioGroup",
  args: {
    legend: "Tipo de persona",
    children: <RadioGroup options={personTypeOptions} defaultValue="natural" />,
  },
  parameters: {
    docs: {
      description: {
        story: "`Fieldset` agrupa un `RadioGroup` completo, aportando el `<legend>` semántico del formulario.",
      },
    },
  },
};

export const CheckboxGroupStory: Story = {
  name: "CheckboxGroup",
  args: {
    legend: "Notificaciones",
    children: (
      <>
        <CheckboxField label="Correo" defaultChecked />
        <CheckboxField label="SMS" />
        <CheckboxField label="Push" defaultChecked />
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "`Fieldset` agrupa varios `CheckboxField` relacionados bajo un mismo `<legend>`.",
      },
    },
  },
};

export const Description: Story = {
  args: {
    description: "Selecciona el tipo de persona para continuar con el registro.",
    children: <RadioGroup options={personTypeOptions} defaultValue="natural" />,
  },
};

export const Error: Story = {
  args: {
    invalid: true,
    errorMessage: "Debes seleccionar un tipo de persona.",
    required: true,
    children: <RadioGroup options={personTypeOptions} />,
  },
  parameters: {
    docs: {
      description: {
        story: "El error reemplaza visualmente a la descripción y se asocia al fieldset vía `aria-describedby`.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: <RadioGroup options={personTypeOptions} defaultValue="natural" />,
  },
  parameters: {
    docs: {
      description: {
        story: "`disabled` nativo del `<fieldset>` deshabilita automáticamente todos los controles descendientes.",
      },
    },
  },
};

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
    children: (
      <>
        <CheckboxField label="Correo" defaultChecked />
        <CheckboxField label="SMS" />
        <CheckboxField label="Push" />
      </>
    ),
  },
};

export const CustomClasses: Story = {
  args: {
    legend: "Tipo de persona",
    classNames: {
      root: "rounded-2xl border-sky-300 bg-sky-50 p-5",
      legend: "px-2 font-bold text-sky-950",
      content: "grid gap-4 md:grid-cols-2",
    },
    children: <RadioGroup options={personTypeOptions} defaultValue="natural" />,
  },
};

export const Unstyled: Story = {
  args: {
    unstyled: true,
    classNames: {
      root: "border border-dashed border-ui-border p-4",
      legend: "text-sm font-medium",
      content: "flex flex-col gap-2",
    },
    children: <RadioGroup options={personTypeOptions} defaultValue="natural" />,
  },
};
