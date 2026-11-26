import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusTag } from "./StatusTag";

describe("StatusTag", () => {
  it("muestra texto de estado comprensible sin depender del color y expone data-tone", () => {
    render(<StatusTag tone="success">Liquidado</StatusTag>);
    const tag = screen.getByText("Liquidado");
    expect(tag).toBeInTheDocument();
    expect(tag.closest("[data-tone]")).toHaveAttribute("data-tone", "success");
  });

  it("soporta tono por defecto neutral y unstyled", () => {
    render(<StatusTag unstyled className="custom">Pendiente</StatusTag>);
    const tag = screen.getByText("Pendiente");
    expect(tag).toHaveAttribute("data-tone", "neutral");
    expect(tag).toHaveClass("custom");
  });
});
