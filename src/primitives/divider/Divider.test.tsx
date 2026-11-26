import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Divider } from "./Divider";

describe("Divider", () => {
  it("renderiza separador semántico respetando orientación", () => {
    const { rerender } = render(<Divider />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    expect(sep).toHaveAttribute("data-orientation", "horizontal");

    rerender(<Divider orientation="vertical" />);
    const vSep = screen.getByRole("separator");
    expect(vSep).toHaveAttribute("aria-orientation", "vertical");
    expect(vSep).toHaveAttribute("data-orientation", "vertical");
  });

  it("en modo decorative es ornamental sin rol de separador", () => {
    render(<Divider decorative data-testid="ornament" />);
    expect(screen.queryByRole("separator")).toBeNull();
    const el = screen.getByTestId("ornament");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});
