import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { Button } from "./Button";

afterEach(() => {
  cleanup();
});

describe("Button", () => {
  it("renderiza children y type='button' por defecto", () => {
    render(<Button>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("dispara un solo onClick en un click normal", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Enviar</Button>);
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("NO dispara onClick cuando disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Enviar
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("NO dispara onClick cuando loading, y expone aria-busy", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} loading loadingLabel="Guardando">
        Enviar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Guardando" });
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("size='icon' sin nombre accesible advierte en desarrollo", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Button size="icon">
        <svg aria-hidden="true" />
      </Button>,
    );
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("size='icon' con aria-label NO advierte en desarrollo", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Button size="icon" aria-label="Cerrar">
        <svg aria-hidden="true" />
      </Button>,
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("reenvía ref al <button>", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Guardar</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe("Guardar");
  });

  it("la clase externa className='rounded-none' prevalece", () => {
    render(<Button className="rounded-none">Guardar</Button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass(
      "rounded-none",
    );
  });

  it("asChild renderiza el hijo (<a>) sin anidar <button>", () => {
    render(
      <Button asChild>
        <a href="/destino">Ir</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" }) as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.href).toContain("/destino");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("unstyled no incluye las clases base de variante pero sigue clickable", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button unstyled onClick={onClick}>
        Guardar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).not.toMatch(/inline-flex/);
    expect(button.className).not.toMatch(/bg-ui-primary/);
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
