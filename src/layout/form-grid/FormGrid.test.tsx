import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormGrid } from "./FormGrid";

describe("FormGrid", () => {
  it("mapea columns responsivas a clases estáticas conocidas", () => {
    render(
      <FormGrid data-testid="grid" columns={{ base: 1, md: 2, xl: 4 }}>
        <div>x</div>
      </FormGrid>,
    );
    const cls = screen.getByTestId("grid").className;
    expect(cls).toContain("grid");
    expect(cls).toContain("grid-cols-1");
    expect(cls).toContain("md:grid-cols-2");
    expect(cls).toContain("xl:grid-cols-4");
  });

  it("mapea columns escalar", () => {
    render(
      <FormGrid data-testid="grid" columns={3}>
        <div>x</div>
      </FormGrid>,
    );
    expect(screen.getByTestId("grid").className).toContain("grid-cols-3");
  });

  it("mapea span y span full en FormGrid.Item", () => {
    render(
      <FormGrid columns={4}>
        <FormGrid.Item data-testid="i1" span={{ md: 2 }}>
          <div>a</div>
        </FormGrid.Item>
        <FormGrid.Item data-testid="i2" span="full">
          <div>b</div>
        </FormGrid.Item>
      </FormGrid>,
    );
    expect(screen.getByTestId("i1").className).toContain("md:col-span-2");
    expect(screen.getByTestId("i2").className).toContain("col-span-full");
  });

  it("aplica gap por token y reenvía props DOM (id)", () => {
    render(
      <FormGrid data-testid="grid" id="g" gap="lg">
        <div>x</div>
      </FormGrid>,
    );
    const el = screen.getByTestId("grid");
    expect(el).toHaveAttribute("id", "g");
    expect(el.className).toContain("gap-6");
  });

  it("unstyled devuelve un div sin clases de layout base", () => {
    render(
      <FormGrid data-testid="grid" columns={2} unstyled>
        <div>x</div>
      </FormGrid>,
    );
    const cls = screen.getByTestId("grid").className;
    expect(cls).not.toContain("grid-cols-2");
  });
});
