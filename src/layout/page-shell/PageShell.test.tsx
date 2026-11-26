import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageShell } from "./PageShell";
import { Button } from "../../primitives";

describe("PageShell", () => {
  it("renderiza título accesible, subtítulo, acciones operables y contenido", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(
      <PageShell
        title="Primas por cobrar"
        subtitle="Gestión de cobranza"
        actions={
          <>
            <Button variant="outline" onClick={onBack}>Volver</Button>
            <Button onClick={onSave}>Guardar</Button>
          </>
        }
        data-testid="shell"
      >
        <p>Contenido principal</p>
      </PageShell>,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Primas por cobrar" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Gestión de cobranza")).toBeInTheDocument();
    expect(screen.getByText("Contenido principal")).toBeInTheDocument();
    expect(screen.getByTestId("shell")).toHaveAttribute("aria-labelledby", heading.id);

    await user.click(screen.getByRole("button", { name: "Volver" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("permite configurar headingLevel y unstyled", () => {
    render(
      <PageShell title="Detalle" headingLevel={2} unstyled className="custom-root">
        <div>Body</div>
      </PageShell>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Detalle" })).toBeInTheDocument();
  });
});
