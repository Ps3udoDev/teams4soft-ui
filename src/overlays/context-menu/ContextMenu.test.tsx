import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu } from "./ContextMenu";

describe("ContextMenu", () => {
  it("abre por puntero y teclado sobre la misma fila, ejecuta acción y Escape devuelve foco al disparador", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ContextMenu
        triggerLabel="Acciones de fila 1"
        items={[
          { id: "edit", label: "Editar", onSelect: onEdit },
          { id: "delete", label: "Eliminar", tone: "danger", onSelect: onDelete },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Acciones de fila 1" });
    await user.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveFocus();

    // Abrir por teclado y elegir con flechas + Enter
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
