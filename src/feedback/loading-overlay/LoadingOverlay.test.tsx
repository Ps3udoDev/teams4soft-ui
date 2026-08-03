import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "./LoadingOverlay";

describe("LoadingOverlay", () => {
  it("no renderiza nada cuando open es false", () => {
    const { container } = render(<LoadingOverlay open={false} />);
    expect(container.firstElementChild).toBeNull();
  });

  it("marca aria-busy y expone el mensaje cuando está abierto", () => {
    render(<LoadingOverlay open message="Cargando datos" />);
    const root = screen.getByText("Cargando datos").closest("[aria-busy]");
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("anuncia el estado con role status", () => {
    render(<LoadingOverlay open message="Cargando" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
  });

  it("expone target y blocking como data-*", () => {
    const { container } = render(
      <LoadingOverlay open blocking target="viewport" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-target", "viewport");
    expect(root).toHaveAttribute("data-blocking", "true");
  });

  it("sin blocking deja pasar el puntero", () => {
    const { container } = render(<LoadingOverlay open />);
    expect(container.firstElementChild).not.toHaveAttribute("data-blocking");
  });

  it("avisa si target es container y el padre no está posicionado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <div>
        <LoadingOverlay open target="container" />
      </div>,
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <LoadingOverlay open className="mi-raiz" classNames={{ panel: "mi-panel" }} />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(container.querySelector(".mi-panel")).not.toBeNull();

    rerender(<LoadingOverlay open unstyled className="solo-esta" />);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });
});
