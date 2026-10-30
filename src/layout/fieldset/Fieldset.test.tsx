import { render, screen } from "@testing-library/react";
import { describe, it, expect, expectTypeOf } from "vitest";
import type { ComponentRef } from "react";
import { Fieldset } from "./Fieldset";

describe("Fieldset", () => {
  it("preserves the public native ref type for existing consumers", () => {
    expectTypeOf<ComponentRef<typeof Fieldset>>().toEqualTypeOf<HTMLFieldSetElement>();
  });
  it("preserves the default outlined appearance", () => {
    render(<Fieldset legend="Datos"><span>Contenido</span></Fieldset>);
    expect(screen.getByRole("group")).toHaveAttribute("class", "border border-ui-border rounded-(--radius-ui-md) p-4");
    expect(screen.getByRole("group")).toHaveAttribute("data-variant", "outlined");
    expect(screen.getByText("Datos")).toHaveAttribute("class", "px-1 text-sm font-medium text-ui-foreground");
  });

  it("plain removes border and padding without changing content layout", () => {
    render(<Fieldset legend="Datos" variant="plain"><span>Contenido</span></Fieldset>);
    expect(screen.getByRole("group")).toHaveAttribute("data-variant", "plain");
    expect(screen.getByRole("group")).not.toHaveClass("border", "p-4");
    expect(screen.getByText("Contenido").parentElement).toHaveClass("grid", "gap-4");
  });

  it("section uses a heading to name its region and retains description wiring", () => {
    render(<Fieldset as="section" legend="Resultados" description="Registros encontrados"><span>Contenido</span></Fieldset>);
    const region = screen.getByRole("region", { name: "Resultados" });
    expect(region.tagName).toBe("SECTION");
    expect(screen.getByRole("heading", { level: 3, name: "Resultados" }).id).toBe(region.getAttribute("aria-labelledby"));
    expect(region).toHaveAccessibleDescription("Registros encontrados");
  });
  it("renderiza fieldset con legend semántico", () => {
    render(
      <Fieldset legend="Tipo de persona">
        <input aria-label="x" />
      </Fieldset>,
    );
    const group = screen.getByRole("group", { name: "Tipo de persona" });
    expect(group.tagName).toBe("FIELDSET");
  });

  it("deshabilita descendientes con disabled nativo", () => {
    render(
      <Fieldset legend="G" disabled>
        <input aria-label="campo" />
      </Fieldset>,
    );
    expect(screen.getByLabelText("campo")).toBeDisabled();
  });

  it("asocia descripción y error por aria-describedby", () => {
    render(
      <Fieldset legend="G" invalid description="ayuda" errorMessage="mal">
        <input aria-label="x" />
      </Fieldset>,
    );
    const group = screen.getByRole("group", { name: "G" });
    const ids = group.getAttribute("aria-describedby")!.split(" ");
    expect(screen.getByText("mal").id).toBe(
      ids.find((i) => i === screen.getByText("mal").id),
    );
    expect(group).toHaveAttribute("data-invalid", "true");
  });

  it("aplica classNames por slot y reenvía ref", () => {
    const ref = { current: null as HTMLFieldSetElement | null };
    render(
      <Fieldset ref={ref} legend="G" classNames={{ root: "border-sky-300" }}>
        <span>x</span>
      </Fieldset>,
    );
    expect(ref.current?.tagName).toBe("FIELDSET");
    expect(ref.current?.className).toContain("border-sky-300");
  });
});
