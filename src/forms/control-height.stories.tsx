import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./text-field/TextField";
import { DateField } from "./date-field/DateField";
import { SearchableSelectField } from "./searchable-select-field/SearchableSelectField";
import { FormField } from "./form-field/FormField";

const meta: Meta = { title: "Forms/ControlHeight", tags: ["autodocs"] };
export default meta;
type Story = StoryObj;

export const ModuleOverride: Story = {
  render: () => <div className="grid max-w-lg gap-4" style={{ "--ui-control-height": "3rem" } as React.CSSProperties}>
    <FormField label="Texto"><TextField /></FormField>
    <DateField label="Fecha" value={null} onValueChange={() => {}} />
    <SearchableSelectField label="Área" value={null} onValueChange={() => {}}
      options={["ACTUARIA", "SISTEMAS"]} getOptionValue={(value) => value} getOptionLabel={(value) => value} />
    <FormField label="Texto pequeño"><TextField size="sm" /></FormField>
    <FormField label="Texto grande"><TextField size="lg" /></FormField>
  </div>,
};
