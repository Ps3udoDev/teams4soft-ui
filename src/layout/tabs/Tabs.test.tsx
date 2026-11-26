import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  it("flechas cambian foco según orientación y volver al panel conserva el texto capturado", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        defaultValue="datos"
        items={[
          { value: "datos", label: "Datos", content: <input aria-label="Póliza" /> },
          { value: "coberturas", label: "Coberturas", content: <input aria-label="Prima" /> },
          { value: "notas", label: "Notas", content: <p>Panel notas</p> },
        ]}
      />,
    );

    const tabDatos = screen.getByRole("tab", { name: "Datos" });
    const tabCoberturas = screen.getByRole("tab", { name: "Coberturas" });
    const inputPoliza = screen.getByLabelText("Póliza");

    await user.type(inputPoliza, "POL-999");
    expect(inputPoliza).toHaveValue("POL-999");

    tabDatos.focus();
    await user.keyboard("{ArrowRight}");
    expect(tabCoberturas).toHaveFocus();
    expect(tabCoberturas).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Prima")).toBeVisible();

    await user.keyboard("{ArrowLeft}");
    expect(tabDatos).toHaveFocus();
    expect(screen.getByLabelText("Póliza")).toHaveValue("POL-999");
  });

  it("en orientación vertical usa ArrowDown y ArrowUp", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        orientation="vertical"
        defaultValue="a"
        items={[
          { value: "a", label: "Uno", content: <div>Contenido 1</div> },
          { value: "b", label: "Dos", content: <div>Contenido 2</div> },
        ]}
      />,
    );
    const tabA = screen.getByRole("tab", { name: "Uno" });
    const tabB = screen.getByRole("tab", { name: "Dos" });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
    tabA.focus();
    await user.keyboard("{ArrowDown}");
    expect(tabB).toHaveFocus();
    expect(screen.getByText("Contenido 2")).toBeVisible();
  });
});
