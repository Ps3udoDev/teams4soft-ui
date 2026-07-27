import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Fieldset } from "./Fieldset";

describe("Fieldset", () => {
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
