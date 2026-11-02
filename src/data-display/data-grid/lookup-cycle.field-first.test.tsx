import { EntityLookupField } from "../entity-lookup-field/EntityLookupField";
import { DataGrid } from "./DataGrid";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

type Row = { id: string; ramo: number | null };

describe("ciclo de módulos del lookup, entrando por EntityLookupField", () => {
  it("el campo y la celda lookup del grid se renderizan", () => {
    render(<>
      <EntityLookupField<Row> aria-label="Suelto" selectedItem={null} onSelectionChange={() => {}} getItemId={row => row.id} getItemLabel={row => row.id} columns={[{ field: "id", header: "Id" }]} items={[]} />
      <DataGrid<Row> columns={[{ field: "ramo", header: "Ramo", type: "lookup", editable: true, loadOptions: async () => [] }]} defaultValue={[{ id: "r-1", ramo: null }]} getRowId={row => row.id} />
    </>);
    expect(screen.getByRole("textbox", { name: "Suelto" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ramo" })).toBeInTheDocument();
  });
});
