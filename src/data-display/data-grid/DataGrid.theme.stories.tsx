import * as React from "react";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { DataGrid } from "./DataGrid";
import { dateColumn, selectColumn, textColumn } from "./column-factories";
import type { DataGridColumn } from "./DataGrid.types";
import { people, personColumns, personLabel, plain } from "../entity-lookup-field/lookup-story-data";
import type { Person } from "../entity-lookup-field/lookup-story-data";

type Claim = { id: string; claim: string; reportedAt: string | null; status: string; adjuster: number | null };
type Adjuster = Person & { value: number; label: string };

const adjusters: Adjuster[] = people.slice(0, 40).map((person) => ({ ...person, value: person.id, label: personLabel(person) }));
const searchAdjusters = async (query: string) => {
  const needle = plain(query);
  return adjusters.filter((adjuster) => !needle || plain(`${adjuster.code} ${adjuster.label}`).includes(needle));
};

const claims: Claim[] = Array.from({ length: 6 }, (_, index) => ({
  id: `siniestro-${index + 1}`,
  claim: `SIN-${String(2400 + index)}`,
  reportedAt: `2026-10-${String(index + 3).padStart(2, "0")}`,
  status: ["open", "review", "closed"][index % 3]!,
  adjuster: index + 1,
}));
const claimId = (row: Claim) => row.id;

const claimColumns: DataGridColumn<Claim>[] = [
  textColumn<Claim>("claim", "Siniestro", { editable: true, minWidth: 130 }),
  dateColumn<Claim>("reportedAt", "Aviso", { editable: true, minWidth: 150 }),
  selectColumn<Claim, { value: string; label: string }>("status", "Estado", {
    editable: true,
    minWidth: 150,
    options: [{ value: "open", label: "Abierto" }, { value: "review", label: "En revisión" }, { value: "closed", label: "Cerrado" }],
  }),
  { field: "adjuster", header: "Ajustador", type: "lookup", editable: true, minWidth: 240, loadOptions: searchAdjusters, lookupColumns: personColumns, filter: false },
];

// Los overlays se portalan al body: el tema también debe alcanzarlos desde ahí.
const claimsTheme = `
.claims-theme, body.claims-portals {
  --claims-navy: #1f3864;
  --claims-border: #a7b0bc;
  --claims-readonly: #f2f4f7;
  --claims-font: Arial, sans-serif;
  --ui-primary: var(--claims-navy);
  --ui-border: var(--claims-border);
  --ui-muted: var(--claims-readonly);
  --ui-radius-md: 0;
  --ui-grid-header-bg: var(--claims-navy);
  --ui-grid-header-fg: #fff;
  --ui-grid-row-alt: #f7f9fc;
  --ui-grid-font: var(--claims-font);
}
/* body.claims-portals cubre toda la página: la comparación restituye los valores por defecto de tokens.css. */
.claims-default {
  --ui-primary: #4f46e5;
  --ui-border: #e4e4e7;
  --ui-muted: #f4f4f5;
  --ui-radius-md: 0.5rem;
  --ui-grid-header-bg: var(--ui-muted);
  --ui-grid-header-fg: var(--ui-foreground);
  --ui-grid-row-alt: color-mix(in srgb, var(--ui-muted) 50%, transparent);
  --ui-grid-font: initial;
}
`;

const withClaimsPortals: Decorator = (Story) => {
  React.useEffect(() => {
    document.body.classList.add("claims-portals");
    return () => document.body.classList.remove("claims-portals");
  }, []);
  return <Story />;
};

function ThemeExample() {
  return <>
    <style>{claimsTheme}</style>
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="claims-themed" className="claims-theme grid content-start gap-2">
        <h3 id="claims-themed" className="text-sm font-semibold">Con el tema Siniestros</h3>
        <DataGrid columns={claimColumns} defaultValue={claims} getRowId={claimId} pagination={false} />
      </section>
      <section aria-labelledby="claims-default" className="claims-default grid content-start gap-2">
        <h3 id="claims-default" className="text-sm font-semibold">Tema por defecto</h3>
        <DataGrid columns={claimColumns} defaultValue={claims} getRowId={claimId} pagination={false} />
      </section>
    </div>
  </>;
}

const meta = {
  title: "Data display/DataGrid/Tema Siniestros",
  parameters: {
    layout: "padded",
    docs: { description: { component: "Un módulo se adapta solo con tokens `--ui-*`, sin tocar componentes. El bloque de la story redefine los tokens bajo `.claims-theme` y, para los overlays que se montan en el body (selector, calendario y modal de búsqueda), bajo `body.claims-portals`; el decorador añade esa clase mientras la story está montada." } },
  },
  decorators: [withClaimsPortals],
} satisfies Meta;
export default meta;

export const TemaSiniestros: StoryObj<typeof meta> = { render: () => <ThemeExample /> };
