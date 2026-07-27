import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RadioGroup } from "./RadioGroup";
import type { RadioOption } from "./RadioGroup.types";

const planOptions: RadioOption<"free" | "pro" | "enterprise">[] = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise", disabled: true },
];

const themeOptions: RadioOption<"light" | "dark" | "system">[] = [
  {
    value: "light",
    label: "Claro",
    description: "Fondo blanco, ideal para ambientes con mucha luz.",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Fondo oscuro, reduce el brillo en ambientes con poca luz.",
  },
  {
    value: "system",
    label: "Sistema",
    description: "Sigue la preferencia configurada en el sistema operativo.",
  },
];

const cardOptions: RadioOption<"monthly" | "yearly">[] = [
  { value: "monthly", label: "Mensual", description: "$10 / mes" },
  { value: "yearly", label: "Anual", description: "$96 / año (ahorra 20%)" },
];

const meta: Meta<typeof RadioGroup> = {
  title: "Forms/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  args: {
    label: "Plan",
    options: planOptions,
  },
  render: (args) => (
    <div className="w-96">
      <RadioGroup {...args} />
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    defaultValue: "free",
  },
};

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
    defaultValue: "free",
  },
};

export const Descriptions: Story = {
  args: {
    label: "Tema",
    options: themeOptions,
    defaultValue: "system",
  },
};

export const DisabledOption: Story = {
  args: {
    defaultValue: "free",
  },
  parameters: {
    docs: {
      description: {
        story:
          "La opción `enterprise` está deshabilitada (`disabled: true`): se omite al navegar con flechas y no puede seleccionarse.",
      },
    },
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
    errorMessage: "Elige un plan para continuar.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "El error reemplaza visualmente a la descripción y se asocia al grupo vía `aria-describedby`.",
      },
    },
  },
};

export const CardOptions: Story = {
  args: {
    label: "Periodicidad",
    options: cardOptions,
    defaultValue: "monthly",
    orientation: "horizontal",
    renderOption: (option) => (
      // No leas `state.checked` para estilos (es best-effort y se congela en
      // modo no controlado tras la primera interacción): el `Item` ancestro
      // ya lleva la clase `group`, así que `group-data-[state=checked]` lee
      // el `data-state` REAL que Radix mantiene actualizado en todo momento.
      <div className="flex w-40 flex-col gap-1 rounded-(--radius-ui-md) border border-ui-border p-4 transition-colors group-data-[state=checked]:border-ui-primary group-data-[state=checked]:bg-ui-primary/5">
        <span className="text-sm font-semibold text-ui-foreground">
          {option.label}
        </span>
        <span className="text-sm text-ui-foreground/60">
          {option.description}
        </span>
      </div>
    ),
    classNames: {
      options: "flex-wrap",
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "`renderOption` reemplaza el contenido visual dentro de cada `Item` sin perder `role=\"radio\"`. El `Item` lleva la clase `group`, así que el `data-state` REAL que Radix mantiene ahí es legible desde cualquier descendiente con `group-data-[state=checked]:...` — la fuente de verdad para el estado visual, tanto en modo controlado como no controlado. `state.checked` (el segundo argumento de `renderOption`) es solo un valor best-effort para render condicional (p. ej. decidir qué ícono mostrar), nunca para estilos.",
      },
    },
  },
};

export const CustomClasses: Story = {
  args: {
    defaultValue: "pro",
    classNames: {
      options: "gap-3",
      option:
        "rounded-xl border p-3 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-50",
      control: "border-emerald-600 group-data-[state=checked]:border-emerald-600",
      indicator: "after:bg-emerald-600",
      optionLabel: "font-semibold text-emerald-950",
    },
  },
};

export const Unstyled: Story = {
  args: {
    defaultValue: "free",
    unstyled: true,
    classNames: {
      root: "grid gap-2",
      label: "text-sm font-medium",
      options: "flex flex-col gap-2",
      option: "flex items-center gap-2",
      control:
        "flex h-4 w-4 items-center justify-center border border-dashed border-ui-border",
      indicator: "after:block after:h-2 after:w-2 after:rounded-full after:bg-ui-primary",
      optionLabel: "text-sm",
    },
  },
};

export const Keyboard: Story = {
  args: {
    defaultValue: "free",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Enfoca cualquier opción y usa las flechas para moverte entre opciones (roving tabindex de Radix); la opción deshabilitada se omite. `Space`/`Enter` no son necesarios: mover el foco con flechas ya selecciona la opción, siguiendo el patrón ARIA `radiogroup`.",
      },
    },
  },
};

export const RTL: Story = {
  args: {
    label: "الخطة",
    options: [
      { value: "free", label: "مجاني" },
      { value: "pro", label: "احترافي" },
      { value: "enterprise", label: "المؤسسات", disabled: true },
    ] as RadioOption<"free" | "pro" | "enterprise">[],
    defaultValue: "free",
    orientation: "horizontal",
  },
  render: (args) => (
    <div dir="rtl" className="w-96">
      <RadioGroup {...args} />
    </div>
  ),
};
