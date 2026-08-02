import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchableSelectField } from "./SearchableSelectField";

interface Currency {
  code: string;
  name: string;
  aliases?: string[];
  discontinued?: boolean;
}

const currencies: Currency[] = [
  { code: "USD", name: "Dólar estadounidense", aliases: ["USA", "dolar"] },
  { code: "EUR", name: "Euro", aliases: ["europa"] },
  { code: "MXN", name: "Peso mexicano", aliases: ["México"] },
  { code: "PEN", name: "Sol peruano", aliases: ["Perú"] },
  { code: "COP", name: "Peso colombiano", aliases: ["Colombia"] },
  { code: "VEF", name: "Bolívar fuerte", discontinued: true },
];

const manyOptions: Currency[] = Array.from({ length: 400 }, (_, index) => ({
  code: `C${String(index).padStart(3, "0")}`,
  name: `Opción número ${index + 1}`,
}));

/** Envoltorio controlado: el campo siempre recibe `value` + `onValueChange`. */
function ControlledSelect({
  initialValue = null,
  options = currencies,
  ...props
}: {
  initialValue?: string | null;
  options?: Currency[];
} & Partial<
  Omit<
    React.ComponentProps<typeof SearchableSelectField<Currency, string>>,
    "value" | "onValueChange" | "options"
  >
>) {
  const [value, setValue] = React.useState<string | null>(initialValue);
  return (
    <div className="w-80">
      <SearchableSelectField<Currency, string>
        label="Moneda"
        placeholder="Escribe para filtrar"
        options={options}
        getOptionValue={(option) => option.code}
        getOptionLabel={(option) => option.name}
        getOptionKeywords={(option) => option.aliases ?? []}
        value={value}
        onValueChange={setValue}
        {...props}
      />
      <p className="mt-2 text-xs text-ui-foreground/60">
        Valor emitido: <code>{value === null ? "null" : value}</code>
      </p>
    </div>
  );
}

const meta: Meta<typeof SearchableSelectField> = {
  title: "Forms/SearchableSelectField",
  component: SearchableSelectField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Select de una opción con texto editable para filtrar colecciones locales. Genérico en `TOption`/`TValue`, con accesores tipados y patrón ARIA combobox + listbox. Nunca muta `options` ni selecciona implícitamente.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SearchableSelectField>;

export const PrimitiveOptions: Story = {
  render: () => {
    const [value, setValue] = React.useState<string | null>("EUR");
    return (
      <div className="w-80">
        <SearchableSelectField<string, string>
          label="Código de moneda"
          options={["USD", "EUR", "MXN", "PEN"]}
          getOptionValue={(option) => option}
          getOptionLabel={(option) => option}
          value={value}
          onValueChange={setValue}
        />
      </div>
    );
  },
};

export const ObjectOptions: Story = {
  render: () => <ControlledSelect initialValue="USD" />,
};

export const Filtering: Story = {
  render: () => (
    <ControlledSelect description="Escribe «usa», «peru» o «méxico»: el filtro ignora mayúsculas y tildes, y también busca en las palabras clave." />
  ),
};

export const CustomOption: Story = {
  render: () => (
    <ControlledSelect
      initialValue="USD"
      renderOption={(option) => (
        <span className="flex w-full items-center justify-between gap-2">
          <span>{option.name}</span>
          <span className="text-xs text-ui-foreground/60">{option.code}</span>
        </span>
      )}
      renderValue={(option) => (
        <span className="text-xs font-medium">{option.code}</span>
      )}
    />
  ),
};

export const NoMatches: Story = {
  render: () => (
    <ControlledSelect
      emptyMessage="No encontramos monedas con ese texto"
      description="Escribe «zzz» para ver el estado vacío."
    />
  ),
};

export const DisabledOptions: Story = {
  render: () => (
    <ControlledSelect
      getOptionDisabled={(option) => Boolean(option.discontinued)}
      description="«Bolívar fuerte» está descontinuada: visible pero no seleccionable."
    />
  ),
};

export const Clearable: Story = {
  render: () => <ControlledSelect initialValue="MXN" clearable />,
};

export const AutoSelectFirst: Story = {
  render: () => (
    <ControlledSelect
      autoSelectFirst
      description="Con autoSelectFirst, la primera opción visible queda activa al filtrar (sigue requiriendo Enter para confirmar)."
    />
  ),
};

export const Invalid: Story = {
  render: () => (
    <ControlledSelect invalid errorMessage="Selecciona una moneda válida" />
  ),
};

export const ReadOnly: Story = {
  render: () => <ControlledSelect initialValue="PEN" readOnly />,
};

export const LongOptions: Story = {
  render: () => (
    <ControlledSelect
      options={[
        {
          code: "LONG",
          name: "Unidad de fomento reajustable del sistema financiero nacional de largo plazo",
        },
        ...currencies,
      ]}
      description="Las etiquetas largas se ajustan al ancho del panel, que iguala al del control."
    />
  ),
};

export const ManyOptions: Story = {
  render: () => (
    <ControlledSelect
      options={manyOptions}
      description="400 opciones sin virtualizar. Por encima de ~500 conviene virtualizar (pendiente) o usar EntityLookupField."
    />
  ),
};

export const KeyboardNavigation: Story = {
  render: () => (
    <ControlledSelect
      clearable
      description="ArrowDown/ArrowUp abren y recorren · Home/End extremos · Enter confirma o resuelve el texto · Escape cierra y restaura · Alt+ArrowDown abre sin filtrar."
    />
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <div className="w-full max-w-[360px]">
      <ControlledSelect initialValue="COP" clearable />
    </div>
  ),
};
