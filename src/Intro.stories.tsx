import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "./index";

const quickLinks = [
  { label: "DataGrid (tablas y paginación)", href: "?path=/docs/data-display-datagrid--docs" },
  { label: "EntityLookupField (buscadores de catálogos)", href: "?path=/docs/data-display-entitylookupfield--docs" },
  { label: "LoadingOverlay (capas de carga)", href: "?path=/docs/feedback-loadingoverlay--docs" },
  { label: "FileGenerationIndicator (reportes por formato)", href: "?path=/docs/feedback-filegenerationindicator--docs" },
];

const Intro = () => (
  <div className={cn("mx-auto grid max-w-3xl gap-6 p-6 text-sm")} style={{ color: "var(--ui-foreground)" }}>
    <header className="grid gap-2">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--ui-primary)" }}>
        @teams4soft/teams4soft-ui
      </h1>
      <p className="leading-relaxed">
        Teams4Soft UI reúne los controles que usamos en formularios, consultas y reportes.
        Empieza por un ejemplo, prueba sus estados y consulta las propiedades para integrarlo en tu módulo.
      </p>
    </header>

    <section className="grid gap-2">
      <h2 className="text-base font-semibold">Estilos según el proyecto anfitrión</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <code>@teams4soft/teams4soft-ui/styles.css</code>: aplicación nueva o sin otro framework CSS global (incluye Preflight).
        </li>
        <li>
          <code>@teams4soft/teams4soft-ui/styles-no-preflight.css</code>: migración gradual conviviendo con PrimeReact u otra hoja de estilos global sin alterar sus resets.
        </li>
      </ul>
    </section>

    <section className="grid gap-2">
      <h2 className="text-base font-semibold">Ejemplo de integración</h2>
      <pre className="overflow-x-auto rounded-(--radius-ui-md) border border-ui-border bg-ui-muted/40 p-4 text-xs">
        <code>{`import "@teams4soft/teams4soft-ui/styles-no-preflight.css";
import { DataGrid, EntityLookupField } from "@teams4soft/teams4soft-ui/data-display";
import { LoadingOverlay, FileGenerationIndicator } from "@teams4soft/teams4soft-ui/feedback";`}</code>
      </pre>
    </section>

    <section className="grid gap-2">
      <h2 className="text-base font-semibold">Explora por categoría</h2>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {quickLinks.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              target="_top"
              className="inline-flex items-center rounded-(--radius-ui-sm) border border-ui-border px-3 py-2 font-medium hover:bg-ui-muted/50"
              style={{ color: "var(--ui-primary)" }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
);

const meta: Meta<typeof Intro> = {
  title: "Introducción/Bienvenida",
  component: Intro,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Guía rápida de entrada al catálogo de `@teams4soft/teams4soft-ui`, carga de estilos (con o sin Preflight) y enlaces directos a las familias principales.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Intro>;
export const Default: Story = {
  name: "Primeros pasos",
};
