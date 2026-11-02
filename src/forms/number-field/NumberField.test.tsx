import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { NumberField } from "./NumberField";
import type { NumberFieldProps } from "./NumberField.types";
import { FormField } from "../form-field/FormField";

afterEach(() => {
  cleanup();
});

function getInput(): HTMLInputElement {
  return screen.getByRole("textbox") as HTMLInputElement;
}

describe("NumberField", () => {
  it("muestra miles al escribir, rellena decimales al salir y confirma una sola vez", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <NumberField aria-label="Importe" onValueChange={onValueChange} onCommit={onCommit} />,
    );
    const input = getInput();
    await user.type(input, "1250.5");
    expect(input).toHaveValue("1,250.5");
    expect(onValueChange).toHaveBeenLastCalledWith(1250.5);
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(input).toHaveValue("1,250.50");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1250.5);
  });

  it("Backspace sobre la coma no mueve el cursor al final", async () => {
    const user = userEvent.setup();
    render(<NumberField aria-label="Importe" />);
    const input = getInput();
    await user.type(input, "1250");
    expect(input).toHaveValue("1,250");
    act(() => input.setSelectionRange(2, 2));
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("1,250");
    expect(input.selectionStart).toBe(1);
  });

  it("controlado: conserva el punto de '12.' cuando el padre re-renderiza con 12", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<number | null>(null);
      return <NumberField aria-label="Importe" value={value} onValueChange={setValue} />;
    }
    render(<Controlled />);
    const input = getInput();
    await user.type(input, "12.");
    expect(input).toHaveValue("12.");
  });

  it("controlado: un valor externo distinto reescribe el texto", () => {
    const { rerender } = render(<NumberField aria-label="Importe" value={12} />);
    expect(getInput()).toHaveValue("12.00");
    rerender(<NumberField aria-label="Importe" value={99.5} />);
    expect(getInput()).toHaveValue("99.50");
    rerender(<NumberField aria-label="Importe" value={null} />);
    expect(getInput()).toHaveValue("");
  });

  it("mode percent: 15 se guarda 15 y se muestra 15.00 %", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Tasa" mode="percent" onValueChange={onValueChange} />);
    const input = getInput();
    await user.type(input, "15");
    expect(onValueChange).toHaveBeenLastCalledWith(15);
    await user.tab();
    expect(input).toHaveValue("15.00 %");
  });

  it("mode currency: prefijo al salir, sin prefijo al enfocar", async () => {
    const user = userEvent.setup();
    render(<NumberField aria-label="Importe" mode="currency" defaultValue={1250.5} />);
    const input = getInput();
    expect(input).toHaveValue("$1,250.50");
    await user.tab();
    expect(input).toHaveValue("1,250.50");
  });

  it("fractionDigits=4 no redondea a 2", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="TC" fractionDigits={4} onValueChange={onValueChange} />);
    await user.type(getInput(), "18.6673");
    expect(getInput()).toHaveValue("18.6673");
    expect(onValueChange).toHaveBeenLastCalledWith(18.6673);
  });

  it("vaciar emite null", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Importe" defaultValue={5} onValueChange={onValueChange} />);
    await user.clear(getInput());
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("sin allowNegative ignora el signo menos", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Importe" onValueChange={onValueChange} />);
    await user.type(getInput(), "-5");
    expect(getInput()).toHaveValue("5");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
  });

  it("con allowNegative acepta el signo menos", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Importe" allowNegative onValueChange={onValueChange} />);
    await user.type(getInput(), "-5");
    expect(getInput()).toHaveValue("-5");
    expect(onValueChange).toHaveBeenLastCalledWith(-5);
  });

  it("pegar un texto con simbolo, espacios y comas lo limpia", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Importe" onValueChange={onValueChange} />);
    await user.click(getInput());
    await user.paste("$ 1,234.56 ");
    expect(getInput()).toHaveValue("1,234.56");
    expect(onValueChange).toHaveBeenLastCalledWith(1234.56);
  });

  it("mode integer ignora el punto", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Cantidad" mode="integer" onValueChange={onValueChange} />);
    await user.type(getInput(), "12.5");
    expect(getInput()).toHaveValue("125");
    expect(onValueChange).toHaveBeenLastCalledWith(125);
    expect(getInput()).toHaveAttribute("inputmode", "numeric");
  });

  it("al enfocar selecciona todo; con selectOnFocus=false no", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<NumberField aria-label="Importe" defaultValue={1250.5} />);
    act(() => getInput().focus());
    expect(getInput().selectionStart).toBe(0);
    expect(getInput().selectionEnd).toBe(getInput().value.length);
    unmount();

    render(<NumberField aria-label="Importe" defaultValue={1250.5} selectOnFocus={false} />);
    act(() => getInput().focus());
    const input = getInput();
    expect(input.selectionStart === 0 && input.selectionEnd === input.value.length).toBe(false);
  });

  it("max marca invalid pero no recorta", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField aria-label="Importe" max={100} onValueChange={onValueChange} />);
    const input = getInput();
    expect(input).not.toHaveAttribute("aria-invalid");
    await user.type(input, "150");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("data-invalid", "true");
    expect(onValueChange).toHaveBeenLastCalledWith(150);
  });

  it("min marca invalid", async () => {
    const user = userEvent.setup();
    render(<NumberField aria-label="Importe" min={10} />);
    await user.type(getInput(), "5");
    expect(getInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("Enter llama a onCommit y el blur posterior no lo repite", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberField aria-label="Importe" onCommit={onCommit} />);
    await user.type(getInput(), "7{Enter}");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith(7);
    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("onBlur y onKeyDown del consumidor se invocan", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    const onKeyDown = vi.fn();
    render(<NumberField aria-label="Importe" onBlur={onBlur} onKeyDown={onKeyDown} />);
    await user.type(getInput(), "1{Enter}");
    await user.tab();
    expect(onKeyDown).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("se integra con FormField (label asociado)", () => {
    render(
      <FormField.Root>
        <FormField.Label>Monto</FormField.Label>
        <FormField.Control>
          <NumberField />
        </FormField.Control>
      </FormField.Root>,
    );
    expect(screen.getByLabelText("Monto")).toBe(getInput());
  });

  it("alinea a la derecha con tabular-nums por defecto y unstyled lo omite", () => {
    const { rerender } = render(<NumberField aria-label="Importe" />);
    expect(getInput().className).toContain("tabular-nums");
    expect(getInput().className).toContain("text-right");
    rerender(<NumberField aria-label="Importe" unstyled classNames={{ input: "mi-input" }} />);
    expect(getInput().className).toBe("mi-input");
  });

  it("reenvia la ref al input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<NumberField aria-label="Importe" ref={ref} />);
    expect(ref.current).toBe(getInput());
  });

  it("acepta las props tipadas del contrato", () => {
    const props: NumberFieldProps = { mode: "currency", currencySymbol: "US$", max: 5 };
    render(<NumberField aria-label="Importe" {...props} defaultValue={3} />);
    expect(getInput()).toHaveValue("US$3.00");
  });
});
