import * as React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateField } from "./DateField";
import type { DateFieldValue } from "./DateField.types";

// Radix Popover usa APIs de puntero y scroll que jsdom no implementa. Sin
// estos stubs, abrir el popover lanza `TypeError`.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
});

function day(iso: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`[data-iso="${iso}"]`);
  if (!node) throw new Error(`No existe la celda del día ${iso}`);
  return node;
}

function Controlled({
  initial = null,
  onChange,
  ...rest
}: {
  initial?: DateFieldValue;
  onChange?: (value: DateFieldValue) => void;
} & Partial<React.ComponentProps<typeof DateField>>) {
  const [value, setValue] = React.useState<DateFieldValue>(initial);
  return (
    <DateField
      label="Fecha"
      locale="es-EC"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...rest}
    />
  );
}

describe("DateField — escritura y confirmación", () => {
  it("confirma con Enter y emite el valor ISO", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByLabelText("Fecha");
    await user.type(input, "27/07/2026{Enter}");

    expect(onChange).toHaveBeenCalledWith("2026-07-27");
    expect(input).toHaveValue("27/07/2026");
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("confirma al perder el foco", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(<Controlled onChange={onChange} onBlur={onBlur} />);

    const input = screen.getByLabelText("Fecha");
    await user.type(input, "27.03.2026");
    await user.tab();

    expect(onChange).toHaveBeenCalledWith("2026-03-27");
    expect(onBlur).toHaveBeenCalledWith("2026-03-27");
  });

  it("conserva el texto de una entrada inválida y marca aria-invalid", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByLabelText("Fecha");
    await user.type(input, "31/02/2026{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("31/02/2026");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("emite null cuando se vacía un campo clearable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-27" onChange={onChange} clearable />);

    const input = screen.getByLabelText("Fecha");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("sincroniza un cambio externo de value", () => {
    const noop = () => {};
    const { rerender } = render(
      <DateField label="Fecha" locale="es-EC" value={null} onValueChange={noop} />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveValue("");

    rerender(
      <DateField
        label="Fecha"
        locale="es-EC"
        value="2026-07-27"
        onValueChange={noop}
      />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveValue("27/07/2026");
  });

  it("respeta displayFormat MM/dd/yyyy", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} displayFormat="MM/dd/yyyy" />);

    await user.type(screen.getByLabelText("Fecha"), "07/27/2026{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-07-27");
  });
});

describe("DateField — calendario", () => {
  it("abre por el botón, selecciona un día, emite ISO y cierra", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(day("2026-07-15"));

    expect(onChange).toHaveBeenCalledWith("2026-07-15");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Fecha")).toHaveFocus();
  });

  it("marca el día seleccionado con aria-selected", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="2026-07-10" />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");

    expect(day("2026-07-10")).toHaveAttribute("aria-selected", "true");
    expect(day("2026-07-11")).toHaveAttribute("aria-selected", "false");
  });

  it("deshabilita los días fuera de min/max y los no disponibles", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled
        initial="2026-07-10"
        onChange={onChange}
        min="2026-07-05"
        max="2026-07-20"
        isDateUnavailable={(iso) => iso === "2026-07-12"}
      />,
    );

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");

    expect(day("2026-07-01")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-07-25")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-07-12")).toHaveAttribute("aria-disabled", "true");
    expect(day("2026-07-12")).toHaveAttribute("data-unavailable", "true");
    expect(day("2026-07-15")).not.toHaveAttribute("aria-disabled", "true");

    await user.click(day("2026-07-01"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("navega de mes sin cambiar el valor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /mes siguiente/i }));

    expect(document.querySelector('[data-iso="2026-08-15"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Escape cierra sin borrar el valor y devuelve el foco", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Fecha")).toHaveValue("10/07/2026");
  });

  it("mueve el día activo con las flechas y selecciona con Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");
    await waitFor(() => expect(day("2026-07-10")).toHaveFocus());

    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(day("2026-07-11")).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(day("2026-07-18")).toHaveFocus());
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("2026-07-18");
  });

  it("no pierde pasos cuando varias flechas se procesan en el mismo lote", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="2026-07-10" />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");
    await waitFor(() => expect(day("2026-07-10")).toHaveFocus());

    // Tres pulsaciones dentro de un único `act` fuerzan que React las procese
    // en el mismo lote, sin re-renderizar entre ellas — igual que al mantener
    // pulsada la flecha. Si el handler lee `activeIso` del closure, la segunda
    // y la tercera parten de un valor obsoleto y el día activo se queda corto.
    const grid = screen.getByRole("grid");
    act(() => {
      fireEvent.keyDown(grid, { key: "ArrowRight" });
      fireEvent.keyDown(grid, { key: "ArrowRight" });
      fireEvent.keyDown(grid, { key: "ArrowRight" });
    });

    await waitFor(() =>
      expect(day("2026-07-13")).toHaveAttribute("tabindex", "0"),
    );
  });

  it("mantiene un único día en el orden de tabulación", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="2026-07-10" />);

    await user.click(screen.getByRole("button", { name: /abrir calendario/i }));
    await screen.findByRole("dialog");

    const cells = screen.getAllByRole("gridcell");
    const tabbable = cells.filter((cell) => cell.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(day("2026-07-10"));
  });

  it("no abre el calendario cuando está deshabilitado", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="2026-07-10" disabled />);

    const trigger = screen.getByRole("button", { name: /abrir calendario/i });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DateField — accesibilidad y personalización", () => {
  it("conecta descripción y error con aria-describedby", () => {
    const noop = () => {};
    const { rerender } = render(
      <DateField
        label="Fecha"
        description="Formato dd/mm/aaaa"
        value={null}
        onValueChange={noop}
      />,
    );
    const input = screen.getByLabelText("Fecha");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Formato dd/mm/aaaa",
    );

    rerender(
      <DateField
        label="Fecha"
        description="Formato dd/mm/aaaa"
        errorMessage="Fecha requerida"
        value={null}
        onValueChange={noop}
      />,
    );
    const withError = screen.getByLabelText("Fecha");
    expect(
      document.getElementById(withError.getAttribute("aria-describedby")!),
    ).toHaveTextContent("Fecha requerida");
    // El error reemplaza a la descripción (patrón FormField).
    expect(screen.queryByText("Formato dd/mm/aaaa")).not.toBeInTheDocument();
    expect(withError).toHaveAttribute("aria-invalid", "true");
  });

  it("limpia el valor con el botón de limpiar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="2026-07-27" onChange={onChange} clearable />);

    await user.click(screen.getByRole("button", { name: /limpiar/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reenvía la ref al input", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <DateField label="Fecha" value={null} onValueChange={() => {}} ref={ref} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByLabelText("Fecha"));
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <DateField
        label="Fecha"
        value={null}
        onValueChange={() => {}}
        className="mi-raiz"
        classNames={{ input: "mi-input" }}
      />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(screen.getByLabelText("Fecha")).toHaveClass("mi-input");

    rerender(
      <DateField
        label="Fecha"
        value={null}
        onValueChange={() => {}}
        unstyled
        className="solo-esta"
      />,
    );
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });

  it("expone el estado como data-* en la raíz", () => {
    const { container } = render(
      <DateField
        label="Fecha"
        value={null}
        onValueChange={() => {}}
        readOnly
        required
        invalid
      />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-invalid", "true");
    expect(root).toHaveAttribute("data-readonly", "true");
    expect(root).toHaveAttribute("data-required", "true");
    expect(root).not.toHaveAttribute("data-disabled");
  });
});
