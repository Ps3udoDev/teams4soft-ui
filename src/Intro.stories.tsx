import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "./index";

const Intro = () => (
  <div className={cn("p-6")} style={{ color: "var(--ui-foreground)" }}>
    <h1 style={{ color: "var(--ui-primary)" }}>@teams4soft/teams4soft-ui</h1>
    <p>Infraestructura lista. Los componentes llegan en las siguientes fases.</p>
  </div>
);

const meta: Meta<typeof Intro> = {
  title: "Introducción/Bienvenida",
  component: Intro,
};
export default meta;

type Story = StoryObj<typeof Intro>;
export const Default: Story = {};
