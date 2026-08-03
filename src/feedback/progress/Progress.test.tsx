import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as lib from "../../lib";
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

  it("max={0} produce aria-valuemax y aria-valuenow válidos", () => {
    render(<Progress value={50} max={0} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemax", "0");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("max negativo produce aria-valuenow clamped a 0, nunca negativo", () => {
    const devWarnSpy = vi.spyOn(lib, "devWarn");
    render(<Progress value={5} max={-10} />);
    const bar = screen.getByRole("progressbar");
    // Verificar que aria-valuenow es 0, no -10
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    // Verificar que se emitió la advertencia
    const calls = devWarnSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    if (lastCall?.[0] !== undefined) {
      expect(lastCall[0]).toContain("max");
    }
    devWarnSpy.mockRestore();
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

  it("aplica styles en slots y respeta merge order (style > styles.root)", () => {
    const { container } = render(
      <Progress
        value={50}
        style={{ backgroundColor: "rgb(255, 0, 0)" }}
        styles={{
          root: { backgroundColor: "rgb(0, 255, 0)", padding: "10px" },
          track: { backgroundColor: "rgb(0, 0, 255)" },
          indicator: { opacity: 0.5 },
        }}
      />,
    );

    const root = container.querySelector('[role="progressbar"]') as HTMLDivElement;
    // Track is the last child of root (since there's no header with showValue/label)
    const track = root?.lastElementChild as HTMLDivElement;
    const indicator = track?.querySelector("div") as HTMLDivElement;

    // style wins over styles.root
    expect(root).toHaveStyle("background-color: rgb(255, 0, 0)");
    // styles.root padding is preserved
    expect(root).toHaveStyle("padding: 10px");
    // styles.track is applied
    expect(track).toHaveStyle("background-color: rgb(0, 0, 255)");
    // styles.indicator is applied
    expect(indicator).toHaveStyle("opacity: 0.5");
  });
});
