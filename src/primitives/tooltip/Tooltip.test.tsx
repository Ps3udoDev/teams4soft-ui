import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { Tooltip, TooltipProvider } from "./Tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip", () => {
  it("al enfocar el trigger aparece el content con role tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Exportar reporte">
          <button>Exportar</button>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Exportar reporte");
  });

  it("Escape cierra el tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Exportar reporte">
          <button>Exportar</button>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  it("disabled no monta el tooltip pero el trigger sigue presente con su aria-label", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Exportar reporte" disabled>
          <button aria-label="Exportar reporte">Exportar</button>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Exportar reporte" });
    expect(trigger).toHaveAttribute("aria-label", "Exportar reporte");

    await user.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("open controlado respeta el valor y llama onOpenChange", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Info" open={true} onOpenChange={onOpenChange}>
          <button>Trigger</button>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("Info");

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Al ser controlado, el valor de `open` sigue mandando: el consumidor
    // no actualizó su estado, así que el tooltip sigue montado.
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("classNames.content='rounded-none' aparece en el content", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip content="Info" classNames={{ content: "rounded-none" }}>
          <button>Trigger</button>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.tab();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveClass("rounded-none");
  });
});
