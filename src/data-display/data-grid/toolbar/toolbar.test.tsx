import * as React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GridToolbar } from "./GridToolbar";
import { ColumnToggler } from "./ColumnToggler";
import { dataGridMessagesEs } from "../messages";
import type { DataGridColumn } from "../DataGrid.types";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
});

describe("GridToolbar", () => {
  it("alinea el selector de columnas a la derecha, salvo con unstyled", () => {
    const toggler = (unstyled: boolean) => <ColumnToggler columns={[]} visibility={{}} onToggle={() => {}} messages={dataGridMessagesEs} unstyled={unstyled} className="propia" />;
    const { container, rerender } = render(toggler(false));
    expect(container.querySelector('[data-slot="columnToggler"]')).toHaveClass("ml-auto", "propia");
    rerender(toggler(true));
    expect(container.querySelector('[data-slot="columnToggler"]')).not.toHaveClass("ml-auto");
  });

  it("separa la barra de la tabla 8 px salvo en unstyled", () => {
    const { container, rerender } = render(
      <GridToolbar toggler={<button>Columnas</button>} />,
    );
    expect(container.firstChild).toHaveClass("mb-2");
    rerender(<GridToolbar toggler={<button>Columnas</button>} unstyled />);
    expect(container.firstChild).not.toHaveClass("mb-2");
  });

  it("omite el contenedor sin contenido", () => {
    const { container } = render(<GridToolbar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("compone contenido y toggler con las personalizaciones", () => {
    const { container } = render(
      <GridToolbar toggler={<button>Columnas</button>} unstyled className="toolbar-propia" style={{ padding: 12 }}>
        <button>Exportar</button>
      </GridToolbar>,
    );
    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Columnas" })).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-slot", "toolbar");
    expect(container.firstChild).toHaveAttribute("class", "toolbar-propia");
    expect(container.firstChild).toHaveStyle({ padding: "12px" });
  });
});

describe("ColumnToggler", () => {
  const columns: DataGridColumn<{ policy: string; amount: number; id: string }>[] = [
    { field: "policy", header: "Póliza" },
    { field: "amount", header: "Importe", hidden: true },
    { field: "id", header: "Identificador", hideable: false },
  ];

  it("abre opciones ocultables y comunica el nuevo estado", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ColumnToggler columns={columns} visibility={{ policy: true, amount: false }} onToggle={onToggle} messages={dataGridMessagesEs} />);
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    expect(screen.queryByRole("checkbox", { name: "Identificador" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Importe" })).not.toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(onToggle).toHaveBeenLastCalledWith("policy", false);
  });

  it("permite visibilidad controlada sin cambiarla internamente", async () => {
    const user = userEvent.setup();
    render(<ColumnToggler columns={columns} visibility={{}} onToggle={vi.fn()} messages={dataGridMessagesEs} />);
    await user.click(screen.getByRole("button", { name: "Columnas" }));
    await user.click(screen.getByRole("checkbox", { name: "Póliza" }));
    expect(screen.getByRole("checkbox", { name: "Póliza" })).toBeChecked();
  });

  it("usa icono decorativo de 16 px, nombre accesible, apertura con teclado y cierre con Escape", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ColumnToggler columns={columns} visibility={{ policy: true, amount: true }} onToggle={onToggle} messages={dataGridMessagesEs} />);
    const trigger = screen.getByRole("button", { name: "Columnas" });
    expect(trigger).toHaveTextContent("");
    expect(trigger).toHaveClass("h-8", "w-8");
    const svg = trigger.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const amountCheckbox = screen.getByRole("checkbox", { name: "Importe" });
    await user.click(amountCheckbox);
    expect(onToggle).toHaveBeenLastCalledWith("amount", false);

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
