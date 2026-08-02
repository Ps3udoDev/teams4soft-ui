import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateField } from "./DateField";
import type { DateFieldValue } from "./DateField.types";

/**
 * Envoltorio controlado: `DateField` siempre es controlado (`value` +
 * `onValueChange`), así que cada historia necesita su propio estado.
 */
function ControlledDateField({
  initialValue = null,
  ...props
}: { initialValue?: DateFieldValue } & Omit<
  React.ComponentProps<typeof DateField>,
  "value" | "onValueChange"
>) {
  const [value, setValue] = React.useState<DateFieldValue>(initialValue);
  return (
    <div className="w-80">
      <DateField {...props} value={value} onValueChange={setValue} />
      <p className="mt-2 text-xs text-ui-foreground/60">
        Valor emitido: <code>{value === null ? "null" : value}</code>
      </p>
    </div>
  );
}

const meta: Meta<typeof DateField> = {
  title: "Forms/DateField",
  component: DateField,
  tags: ["autodocs"],
  args: {
    label: "Fecha de vigencia",
    locale: "es-EC",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Campo de fecha con escritura directa y calendario accesible. El valor público es la cadena ISO `YYYY-MM-DD` (nunca un `Date`), por lo que no hay desplazamiento por zona horaria.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DateField>;

export const Default: Story = {
  render: (args) => <ControlledDateField {...args} />,
};

export const TypedDate: Story = {
  name: "TypedDate",
  render: (args) => (
    <ControlledDateField
      {...args}
      description="Escribe 27/07/2026 o 27.07.2026 y confirma con Enter."
    />
  ),
};

export const InvalidInput: Story = {
  render: (args) => (
    <ControlledDateField
      {...args}
      description="Escribe 31/02/2026: el texto se conserva y aparece el error."
      acceptedFormats={["dd/MM/yyyy", "dd.MM.yyyy"]}
    />
  ),
};

export const MinAndMax: Story = {
  render: (args) => (
    <ControlledDateField
      {...args}
      initialValue="2026-07-15"
      min="2026-07-05"
      max="2026-07-25"
      description="Solo del 5 al 25 de julio de 2026."
    />
  ),
};

export const UnavailableDates: Story = {
  render: (args) => (
    <ControlledDateField
      {...args}
      initialValue="2026-07-15"
      isDateUnavailable={(iso) => {
        const day = new Date(
          Number(iso.slice(0, 4)),
          Number(iso.slice(5, 7)) - 1,
          Number(iso.slice(8, 10)),
        ).getDay();
        return day === 0 || day === 6;
      }}
      description="Fines de semana deshabilitados (visibles, no ocultos)."
    />
  ),
};

export const Required: Story = {
  render: (args) => <ControlledDateField {...args} required />,
};

export const Clearable: Story = {
  render: (args) => (
    <ControlledDateField {...args} initialValue="2026-07-27" clearable />
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <ControlledDateField {...args} initialValue="2026-07-27" disabled />
  ),
};

export const ReadOnly: Story = {
  render: (args) => (
    <ControlledDateField {...args} initialValue="2026-07-27" readOnly />
  ),
};

export const ControlledOpen: Story = {
  render: (args) => {
    const [value, setValue] = React.useState<DateFieldValue>("2026-07-27");
    const [open, setOpen] = React.useState(false);
    return (
      <div className="w-80 space-y-2">
        <button
          type="button"
          className="rounded-(--radius-ui-sm) border border-ui-border px-2 py-1 text-sm"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Cerrar calendario" : "Abrir calendario"}
        </button>
        <DateField
          {...args}
          value={value}
          onValueChange={setValue}
          open={open}
          onOpenChange={setOpen}
        />
      </div>
    );
  },
};

export const Locales: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <ControlledDateField
        {...args}
        label="es-EC (dd/MM/yyyy)"
        locale="es-EC"
        initialValue="2026-07-27"
      />
      <ControlledDateField
        {...args}
        label="en-US (MM/dd/yyyy)"
        locale="en-US"
        displayFormat="MM/dd/yyyy"
        firstDayOfWeek={0}
        initialValue="2026-07-27"
      />
      <ControlledDateField
        {...args}
        label="ISO (yyyy-MM-dd)"
        locale="es-EC"
        displayFormat="yyyy-MM-dd"
        initialValue="2026-07-27"
      />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: (args) => (
    <div className="w-full max-w-[360px]">
      <ControlledDateField {...args} initialValue="2026-07-27" clearable />
    </div>
  ),
};

export const KeyboardNavigation: Story = {
  render: (args) => (
    <ControlledDateField
      {...args}
      initialValue="2026-07-27"
      clearable
      description="Enter confirma · ArrowDown abre · flechas mueven el día · PageUp/PageDown cambian de mes · Shift+PageUp/PageDown cambian de año · Escape cierra."
    />
  ),
};
