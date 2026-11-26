import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineMessage } from "./InlineMessage";

describe("InlineMessage", () => {
  it("expone error ligado al campo con role=alert", () => {
    render(
      <>
        <input aria-label="Monto" aria-describedby="monto-err" />
        <InlineMessage id="monto-err" tone="danger">
          El monto debe ser mayor a cero.
        </InlineMessage>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("El monto debe ser mayor a cero.");
    expect(screen.getByLabelText("Monto")).toHaveAccessibleDescription("El monto debe ser mayor a cero.");
  });

  it("aviso informativo no usa role=alert para evitar interrupción innecesaria", () => {
    render(<InlineMessage tone="info">Los cambios se aplicarán al cierre mensual.</InlineMessage>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Los cambios se aplicarán al cierre mensual.");
  });
});
