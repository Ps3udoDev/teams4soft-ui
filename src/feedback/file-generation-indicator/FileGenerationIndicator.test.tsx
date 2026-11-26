import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "../loading-overlay/LoadingOverlay";
import { FileGenerationIndicator } from "./FileGenerationIndicator";
import type { FileGenerationFormat } from "./FileGenerationIndicator.types";

describe("FileGenerationIndicator", () => {
  const formats: FileGenerationFormat[] = ["xlsx", "docx", "pdf", "file"];

  it.each(formats)("renderiza variante %s decorativa con spinner y sin role=status propio", (format) => {
    const { container } = render(<FileGenerationIndicator format={format} />);
    const root = container.querySelector('[data-slot="file-generation-indicator"]')!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveAttribute("data-format", format);
    expect(root).toHaveAttribute("data-size", "md");
    expect(root).toHaveClass("h-12", "w-12");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    // Usa motion-safe:animate-spin del Spinner interno (respeto a prefers-reduced-motion sin setInterval).
    expect(root.querySelector("svg.motion-safe\\:animate-spin")).toBeInTheDocument();
  });

  it("soporta tamaño sm (32 px) y unstyled", () => {
    const { container, rerender } = render(<FileGenerationIndicator format="pdf" size="sm" />);
    const root = container.querySelector('[data-slot="file-generation-indicator"]')!;
    expect(root).toHaveAttribute("data-size", "sm");
    expect(root).toHaveClass("h-8", "w-8");
    rerender(<FileGenerationIndicator format="pdf" size="sm" unstyled />);
    expect(root).not.toHaveClass("h-8");
  });

  it("compuesto con LoadingOverlay emite un único role=status y desaparece al cerrar", () => {
    const { rerender } = render(
      <div className="relative">
        <LoadingOverlay
          open
          message="Generando Excel…"
          indicator={<FileGenerationIndicator format="xlsx" />}
        />
      </div>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent("Generando Excel…");

    rerender(
      <div className="relative">
        <LoadingOverlay
          open={false}
          message="Generando Excel…"
          indicator={<FileGenerationIndicator format="xlsx" />}
        />
      </div>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza en SSR sin errores para las cuatro variantes", () => {
    for (const format of formats) {
      const html = renderToString(<FileGenerationIndicator format={format} />);
      expect(html).toContain(`data-format="${format}"`);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
