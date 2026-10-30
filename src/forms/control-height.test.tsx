import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TextField } from "./text-field/TextField";
import { DateField } from "./date-field/DateField";
import { SearchableSelectField } from "./searchable-select-field/SearchableSelectField";

afterEach(cleanup);

it("shares the configurable height across md controls, preserving sm and lg", () => {
  render(<>
    <TextField size="md" aria-label="Text" />
    <TextField size="sm" aria-label="Small" />
    <TextField size="lg" aria-label="Large" />
    <DateField label="Date" value={null} onValueChange={() => {}} />
    <SearchableSelectField label="Select" value={null} onValueChange={() => {}}
      options={["One"]} getOptionValue={(value) => value} getOptionLabel={(value) => value} />
  </>);
  for (const label of ["Text", "Date", "Select"]) {
    expect(screen.getByLabelText(label).parentElement).toHaveClass("h-(--ui-control-height)");
  }
  expect(screen.getByLabelText("Small").parentElement).toHaveClass("h-8");
  expect(screen.getByLabelText("Large").parentElement).toHaveClass("h-12");
});
