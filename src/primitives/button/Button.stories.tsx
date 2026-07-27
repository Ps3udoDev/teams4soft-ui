import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import type { ButtonVariant, ButtonSize } from "./Button.types";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
  "link",
];

const SIZES: ButtonSize[] = ["sm", "md", "lg", "icon"];

function IconPlus() {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconArrowRight() {
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
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconTrash() {
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
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  );
}

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Guardar",
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.filter((size) => size !== "icon").map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const Icons: Story = {
  args: {
    leadingIcon: <IconPlus />,
    trailingIcon: <IconArrowRight />,
    children: "Continuar",
  },
};

export const IconOnly: Story = {
  args: {
    size: "icon",
    "aria-label": "Eliminar",
    children: <IconTrash />,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    loadingLabel: "Guardando",
    children: "Guardar",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "No disponible",
  },
};

export const AsChild: Story = {
  render: (args) => (
    <Button {...args} asChild>
      <a href="https://example.com">Ir al sitio</a>
    </Button>
  ),
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: "Ancho completo",
  },
  render: (args) => (
    <div className="w-96">
      <Button {...args} />
    </div>
  ),
};

export const CustomClasses: Story = {
  args: {
    variant: "primary",
    className: "rounded-none bg-violet-700 hover:bg-violet-800",
    classNames: {
      leadingIcon: "size-5 text-violet-100",
      spinner: "text-white",
    },
    leadingIcon: <IconPlus />,
    children: "Guardar",
  },
};

export const Unstyled: Story = {
  args: {
    unstyled: true,
    className: "border border-dashed border-ui-border px-4 py-2 rounded-ui-sm",
    children: "Sin estilos por defecto",
  },
};

export const Keyboard: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args}>Primero</Button>
      <Button {...args} variant="secondary">
        Segundo
      </Button>
      <Button {...args} variant="outline">
        Tercero
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Navega con Tab/Shift+Tab y activa con Enter/Espacio; el foco visible usa --ui-focus.",
      },
    },
  },
};
