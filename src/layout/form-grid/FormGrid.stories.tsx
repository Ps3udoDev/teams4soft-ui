import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormGrid } from "./FormGrid";
import { FormField } from "../../forms/form-field/FormField";
import { TextField } from "../../forms/text-field/TextField";

const meta: Meta<typeof FormGrid> = {
  title: "Layout/FormGrid",
  component: FormGrid,
  tags: ["autodocs"],
  render: (args) => (
    <div className="w-full max-w-3xl">
      <FormGrid {...args} />
    </div>
  ),
};
export default meta;

type Story = StoryObj<typeof FormGrid>;

export const OneColumn: Story = {
  args: {
    columns: 1,
    gap: "md",
    children: (
      <>
        <FormField label="Nombre">
          <TextField placeholder="Nombre" />
        </FormField>
        <FormField label="Apellido">
          <TextField placeholder="Apellido" />
        </FormField>
        <FormField label="Correo">
          <TextField type="email" placeholder="nombre@empresa.com" />
        </FormField>
      </>
    ),
  },
};

export const ResponsiveColumns: Story = {
  args: {
    columns: { base: 1, md: 2, xl: 4 },
    gap: "md",
    children: (
      <>
        <FormField label="Nombre">
          <TextField placeholder="Nombre" />
        </FormField>
        <FormField label="Apellido">
          <TextField placeholder="Apellido" />
        </FormField>
        <FormField label="Correo">
          <TextField type="email" placeholder="nombre@empresa.com" />
        </FormField>
        <FormField label="Teléfono">
          <TextField type="tel" placeholder="+52 55 0000 0000" />
        </FormField>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "`columns` mobile-first: 1 columna en `base`, 2 desde `md`, 4 desde `xl`. Cada breakpoint resuelve a una clase Tailwind literal (`grid-cols-1`, `md:grid-cols-2`, `xl:grid-cols-4`).",
      },
    },
  },
};

export const Spans: Story = {
  args: {
    columns: { base: 1, md: 4 },
    gap: "md",
    children: (
      <>
        <FormGrid.Item span={{ md: 2 }}>
          <FormField label="Nombre">
            <TextField placeholder="Nombre" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span={{ md: 2 }}>
          <FormField label="Apellido">
            <TextField placeholder="Apellido" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span="full">
          <FormField label="Correo" description="Se usará para notificaciones.">
            <TextField type="email" placeholder="nombre@empresa.com" />
          </FormField>
        </FormGrid.Item>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "`FormGrid.Item` controla cuántas columnas ocupa cada campo (`span`), incluyendo `\"full\"` para ocupar todo el ancho disponible.",
      },
    },
  },
};

export const TwelveColumns: Story = {
  args: {
    columns: 12,
    gap: "md",
    children: (
      <>
        <FormGrid.Item span={6}>
          <FormField label="Calle">
            <TextField placeholder="Calle y número" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span={6}>
          <FormField label="Código postal">
            <TextField placeholder="00000" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span={4}>
          <FormField label="Ciudad">
            <TextField placeholder="Ciudad" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span={4}>
          <FormField label="Estado">
            <TextField placeholder="Estado" />
          </FormField>
        </FormGrid.Item>
        <FormGrid.Item span={4} start={9}>
          <FormField label="País">
            <TextField placeholder="País" />
          </FormField>
        </FormGrid.Item>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Grid de 12 columnas para layouts de formulario densos (p. ej. direcciones), combinando `span` y `start` explícitos.",
      },
    },
  },
};

export const Alignment: Story = {
  args: {
    columns: 3,
    gap: "md",
    align: "end",
    children: (
      <>
        <FormField label="Nombre">
          <TextField placeholder="Nombre" />
        </FormField>
        <FormField
          label="Descripción"
          description="Un campo con más contenido que empuja la altura de la fila."
        >
          <TextField placeholder="Descripción" />
        </FormField>
        <button
          type="button"
          className="h-10 rounded-(--radius-ui-md) bg-ui-primary px-4 text-sm font-medium text-ui-primary-foreground"
        >
          Enviar
        </button>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "`align=\"end\"` alinea los items al final del eje transversal (`items-end`), útil cuando conviven campos con y sin mensajes de ayuda.",
      },
    },
  },
};

export const CustomClasses: Story = {
  args: {
    columns: { base: 1, md: 2 },
    className: "rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-4",
    children: (
      <>
        <FormField label="Nombre">
          <TextField placeholder="Nombre" />
        </FormField>
        <FormField label="Apellido">
          <TextField placeholder="Apellido" />
        </FormField>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "`className` se combina (`cn`) con las clases base y las de la resolución de `columns`; permite añadir estilos propios sin perder el layout resuelto.",
      },
    },
  },
};

export const Unstyled: Story = {
  args: {
    columns: { base: 1, md: 2 },
    unstyled: true,
    className: "grid grid-cols-1 gap-6 md:grid-cols-2",
    children: (
      <>
        <FormField label="Nombre">
          <TextField placeholder="Nombre" />
        </FormField>
        <FormField label="Apellido">
          <TextField placeholder="Apellido" />
        </FormField>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "`unstyled` devuelve un `div` sin las clases de layout base (`grid`, columnas, gap, align); el consumidor aporta su propio layout vía `className`.",
      },
    },
  },
};

export const LongErrors: Story = {
  args: {
    columns: { base: 1, md: 2 },
    gap: "md",
    children: (
      <>
        <FormField
          label="Correo"
          invalid
          errorMessage="Ingresa un correo electrónico válido, por ejemplo nombre@empresa.com. Verifica que no tenga espacios ni caracteres especiales."
        >
          <TextField type="email" placeholder="nombre@empresa.com" />
        </FormField>
        <FormField
          label="Contraseña"
          invalid
          errorMessage="La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, un número y un símbolo."
        >
          <TextField type="password" placeholder="Contraseña" />
        </FormField>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Mensajes de error largos no rompen el grid: cada `FormField` controla su propio contenido, el grid solo controla la posición de las celdas.",
      },
    },
  },
};

export const Mobile: Story = {
  args: {
    columns: { base: 1, sm: 2, lg: 3 },
    gap: "sm",
    children: (
      <>
        <FormField label="Nombre">
          <TextField size="sm" placeholder="Nombre" />
        </FormField>
        <FormField label="Apellido">
          <TextField size="sm" placeholder="Apellido" />
        </FormField>
        <FormField label="Correo">
          <TextField size="sm" type="email" placeholder="nombre@empresa.com" />
        </FormField>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Contenedor angosto (simulando viewport móvil): el grid colapsa a 1 columna (`base`), pasando a 2 en `sm` y 3 en `lg` cuando el contenedor crece.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-sm">
      <FormGrid {...args} />
    </div>
  ),
};
