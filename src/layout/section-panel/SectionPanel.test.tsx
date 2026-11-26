import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionPanel } from "./SectionPanel";
import { Button } from "../../primitives";

describe("SectionPanel", () => {
  it("muestra encabezado, acciones y contenido sin colapso por defecto", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <SectionPanel title="Datos generales" description="Información básica" actions={<Button onClick={onAdd}>Agregar</Button>}>
        <p>Campos de la sección</p>
      </SectionPanel>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Datos generales" })).toBeInTheDocument();
    expect(screen.getByText("Información básica")).toBeInTheDocument();
    expect(screen.getByText("Campos de la sección")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("colapsa/expande exponiendo aria-expanded y devuelve el foco al disparador si el foco estaba dentro", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [collapsed, setCollapsed] = React.useState(false);
      return (
        <SectionPanel
          title="Coberturas"
          collapsible
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          actions={<Button onClick={() => setCollapsed(true)}>Colapsar desde acción</Button>}
        >
          <input aria-label="Monto asegurado" />
          <button type="button" onClick={() => setCollapsed(true)}>Ocultar sección</button>
        </SectionPanel>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Coberturas" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const input = screen.getByLabelText("Monto asegurado");
    await user.click(input);
    expect(input).toHaveFocus();

    // Colapsar con foco dentro del contenido -> devuelve foco al disparador
    await user.click(screen.getByRole("button", { name: "Ocultar sección" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Monto asegurado")).not.toBeVisible();
    expect(trigger).toHaveFocus();

    // Expandir nuevamente con Enter/click sobre el disparador
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Monto asegurado")).toBeVisible();
  });
});
