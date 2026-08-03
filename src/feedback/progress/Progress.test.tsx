import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";

describe("Progress — determinado", () => {
  it("expone role progressbar con min, max y now", () => {
    render(<Progress value={40} label="Subiendo" />);
    const bar = screen.getByRole("progressbar", { name: "Subiendo" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("recorta el valor al rango [0, max]", () => {
    const { rerender } = render(<Progress value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

    rerender(<Progress value={250} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("respeta un max personalizado", () => {
    render(<Progress value={25} max={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "50");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
  });

  it("muestra el porcentaje redondeado con showValue", () => {
    render(<Progress value={33} max={99} showValue />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});

describe("Progress — indeterminado", () => {
  it("omite aria-valuenow cuando no hay value", () => {
    render(<Progress label="Cargando" />);
    const bar = screen.getByRole("progressbar", { name: "Cargando" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("data-indeterminate", "true");
  });

  it("ignora showValue en modo indeterminado", () => {
    render(<Progress showValue />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

describe("Progress — personalización", () => {
  it("expone tone y size como data-*", () => {
    render(<Progress value={10} tone="danger" size="lg" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("data-tone", "danger");
    expect(bar).toHaveAttribute("data-size", "lg");
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <Progress value={10} className="mi-raiz" classNames={{ track: "mi-track" }} />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(container.querySelector(".mi-track")).not.toBeNull();

    rerender(<Progress value={10} unstyled className="solo-esta" />);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });

  it("reenvía la ref a la raíz", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress value={10} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
