import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberField } from "./NumberField";
import { FormField } from "../form-field/FormField";

function Controlled(props: React.ComponentProps<typeof NumberField>) {
  const [value, setValue] = React.useState<number | null>(null);
  return (
    <div className="w-64">
      <NumberField {...props} value={value} onValueChange={setValue} />
      <p className="mt-2 text-xs text-ui-foreground/60">
        Valor: <code>{value === null ? "null" : value}</code>
      </p>
    </div>
  );
}

const meta: Meta<typeof NumberField> = {
  title: "Forms/NumberField",
  component: NumberField,
  tags: ["autodocs"],
  args: { "aria-label": "Importe" },
  parameters: {
    docs: {
      description: {
        component:
          "Campo numérico con separador de miles mientras se escribe. El valor público es `number | null`; `onCommit` se dispara al salir o con Enter.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof NumberField>;

export const Default: Story = { render: (args) => <Controlled {...args} /> };
export const Currency: Story = {
  render: (args) => <Controlled {...args} mode="currency" />,
};
export const Percent: Story = {
  render: (args) => <Controlled {...args} mode="percent" />,
};
export const ExchangeRate: Story = {
  render: (args) => <Controlled {...args} fractionDigits={4} />,
};
export const Integer: Story = {
  render: (args) => <Controlled {...args} mode="integer" />,
};
export const AllowNegative: Story = {
  render: (args) => <Controlled {...args} allowNegative />,
};
export const WithMax: Story = {
  render: (args) => <Controlled {...args} max={100} />,
};
export const Disabled: Story = {
  render: (args) => <Controlled {...args} disabled />,
};
export const InFormField: Story = {
  render: (args) => (
    <FormField.Root>
      <FormField.Label>Monto</FormField.Label>
      <Controlled {...args} aria-label={undefined} mode="currency" />
    </FormField.Root>
  ),
};
