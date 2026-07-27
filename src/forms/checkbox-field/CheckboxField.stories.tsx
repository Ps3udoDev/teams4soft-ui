import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckboxField } from "./CheckboxField";
import type { CheckedState } from "./CheckboxField.types";

function IconStar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3 w-3"
      focusable="false"
      aria-hidden="true"
    >
      <path d="M12 2.5 15 9l7 .6-5.3 4.6L18.2 21 12 17.3 5.8 21l1.5-6.8L2 9.6 9 9l3-6.5Z" />
    </svg>
  );
}

const meta: Meta<typeof CheckboxField> = {
  title: "Forms/CheckboxField",
  component: CheckboxField,
  tags: ["autodocs"],
  args: {
    label: "Habilitado",
  },
  render: (args) => (
    <div className="w-80">
      <CheckboxField {...args} />
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof CheckboxField>;

export const Unchecked: Story = {};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Indeterminate: Story = {
  render: () => {
    const [checked, setChecked] = React.useState<CheckedState>(
      "indeterminate",
    );
    return (
      <div className="w-80">
        <CheckboxField
          label="Seleccionar todo"
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "`indeterminate` representa selección parcial (p. ej. algunos ítems de un grupo), no un tercer valor de negocio. Radix expone `data-state=\"indeterminate\"` y `aria-checked=\"mixed\"`.",
      },
    },
  },
};

export const WithDescription: Story = {
  args: {
    label: "Notificaciones por correo",
    description: "Recibirás un resumen semanal de actividad.",
  },
};

export const Invalid: Story = {
  args: {
    label: "Acepto los términos",
    invalid: true,
    errorMessage: "Debes aceptar los términos para continuar.",
    required: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "El error reemplaza visualmente a la descripción y marca `aria-invalid` en el control.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    label: "No disponible",
    disabled: true,
    description: "Este control está deshabilitado por ahora.",
  },
};

export const CustomIndicator: Story = {
  args: {
    label: "Marcar como favorito",
    defaultChecked: true,
    indicator: <IconStar />,
    indeterminateIndicator: <IconStar />,
  },
};

export const CustomClasses: Story = {
  args: {
    label: "Habilitado",
    defaultChecked: true,
    classNames: {
      control:
        "rounded-full border-violet-500 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600",
      indicator: "text-white",
      label: "font-semibold text-violet-950",
    },
  },
};

export const Unstyled: Story = {
  args: {
    label: "Sin estilos por defecto",
    defaultChecked: true,
    unstyled: true,
    classNames: {
      root: "flex items-start gap-2",
      control:
        "flex h-4 w-4 items-center justify-center border border-dashed border-ui-border",
      label: "text-sm text-ui-foreground",
    },
  },
};

export const Keyboard: Story = {
  args: {
    label: "Enfoca este control y presiona Space",
  },
  parameters: {
    docs: {
      description: {
        story:
          "El control es un botón nativo (`role=\"checkbox\"`): recibe foco con Tab y alterna con la tecla Space, con foco visible vía `focus-visible:ring-2`.",
      },
    },
  },
};
