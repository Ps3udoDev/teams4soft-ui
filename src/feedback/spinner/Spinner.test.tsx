import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("con `label` expone un nombre accesible en un role status", () => {
    render(<Spinner label="Cargando datos" />);
    expect(screen.getByRole("status", { name: "Cargando datos" })).toBeInTheDocument();
  });

  it("sin `label` ni `decorative` sigue siendo un status sin nombre", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("con `decorative` desaparece del árbol de accesibilidad", () => {
    const { container } = render(<Spinner decorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("avisa en desarrollo si se combinan label y decorative", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Spinner label="Cargando" decorative />);
    expect(warn).toHaveBeenCalledTimes(1);
    const warnCall = warn.mock.calls[0]?.[0];
    expect(warnCall).toBeDefined();
    expect(String(warnCall)).toMatch(/Spinner/);
    expect(String(warnCall)).toMatch(/decorative/);
    warn.mockRestore();
  });

  it("con label y decorative, decorative gana (sin role ni aria-label)", () => {
    const { container } = render(<Spinner label="Cargando" decorative />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).not.toHaveAttribute("aria-label");
  });

  it("expone el tamaño como data-size", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstElementChild).toHaveAttribute("data-size", "lg");
  });

  it("respeta unstyled y reenvía className y ref", () => {
    const ref = React.createRef<HTMLSpanElement>();
    const { container } = render(
      <Spinner ref={ref} unstyled className="solo-esta" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
