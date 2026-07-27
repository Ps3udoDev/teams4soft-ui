import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./FormField";

/**
 * Historias que no dependen de `TextField` (Task 5): usan un `<input>`
 * simple estilizado localmente solo para demostrar el layout de `FormField`.
 */
const inputClassName =
  "h-10 w-full rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-3 text-sm text-ui-foreground placeholder:text-ui-foreground/40 outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:opacity-50";

function DemoInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClassName} {...props} />;
}

const meta: Meta<typeof FormField> = {
  title: "Forms/FormField",
  component: FormField,
  tags: ["autodocs"],
  args: {
    label: "Correo",
  },
  render: (args) => (
    <div className="w-80">
      <FormField {...args}>
        <DemoInput type="email" placeholder="nombre@empresa.com" />
      </FormField>
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof FormField>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Optional: Story = {
  args: {
    label: "Teléfono",
    optional: true,
  },
};

export const Description: Story = {
  args: {
    description: "Usaremos este correo para notificaciones de la cuenta.",
  },
};

export const Error: Story = {
  args: {
    description: "Usaremos este correo para notificaciones de la cuenta.",
    errorMessage: "Ingresa un correo válido.",
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
    disabled: true,
    description: "Este campo no está disponible por ahora.",
  },
};

export const HorizontalCustom: Story = {
  args: {
    description: "Usaremos este correo para notificaciones.",
    className: "grid grid-cols-[8rem_1fr] items-start gap-x-4 gap-y-1",
    classNames: {
      description: "col-start-2",
      error: "col-start-2",
    },
  },
  render: (args) => (
    <div className="w-96">
      <FormField {...args}>
        <DemoInput type="email" placeholder="nombre@empresa.com" />
      </FormField>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "El layout horizontal se resuelve por composición de clases (`className` + `classNames`), no como variante propia de `FormField`.",
      },
    },
  },
};

export const ReservedSpace: Story = {
  render: () => {
    const [showError, setShowError] = React.useState(false);
    return (
      <div className="flex w-80 flex-col gap-3">
        <FormField
          label="Correo"
          reserveMessageSpace
          errorMessage={showError ? "Ingresa un correo válido." : undefined}
        >
          <DemoInput type="email" placeholder="nombre@empresa.com" />
        </FormField>
        <button
          type="button"
          className="self-start text-sm text-ui-primary underline-offset-4 hover:underline"
          onClick={() => setShowError((prev) => !prev)}
        >
          {showError ? "Ocultar error" : "Mostrar error"}
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "`reserveMessageSpace` reserva la altura del área de mensaje para que alternar el error no mueva el layout.",
      },
    },
  },
};

export const Unstyled: Story = {
  args: {
    unstyled: true,
    required: true,
    description: "Sin clases visuales por defecto: solo ids y ARIA.",
    className: "flex flex-col gap-1 border border-dashed border-ui-border p-3",
  },
};
