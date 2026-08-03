import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("es decorativo: aria-hidden y fuera del árbol de accesibilidad", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renderiza una línea por cada `lines` con shape text", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelectorAll("[data-skeleton-line]")).toHaveLength(3);
  });

  it("ignora `lines` cuando la forma no es text", () => {
    const { container } = render(<Skeleton shape="circle" lines={3} />);
    expect(container.querySelectorAll("[data-skeleton-line]")).toHaveLength(0);
  });

  it("expone shape y animation como data-*", () => {
    const { container } = render(<Skeleton shape="rect" animation="none" />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-shape", "rect");
    expect(root).toHaveAttribute("data-animation", "none");
  });

  it("aplica width y height numéricos como píxeles", () => {
    const { container } = render(<Skeleton shape="rect" width={120} height={40} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("120px");
    expect(root.style.height).toBe("40px");
  });

  it("respeta unstyled y reenvía ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <Skeleton ref={ref} unstyled className="solo-esta" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
