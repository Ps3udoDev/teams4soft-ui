import type { Meta, StoryObj } from "@storybook/react-vite";
import { Divider } from "./Divider";

const meta: Meta<typeof Divider> = {
  title: "Primitives/Divider",
  component: Divider,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  render: () => (
    <div className="space-y-3 text-sm">
      <p>Sección superior</p>
      <Divider />
      <p>Sección inferior</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-6 items-center gap-3 text-sm">
      <span>Póliza</span>
      <Divider orientation="vertical" />
      <span>Endoso</span>
    </div>
  ),
};
