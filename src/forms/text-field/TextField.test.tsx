import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, useState } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { TextField } from "./TextField";
import { FormField } from "../form-field/FormField";

afterEach(() => {
  cleanup();
});

describe("TextField", () => {
  it("controlado: teclear dispara onValueChange con el valor acumulado y el input refleja value", async () => {
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <TextField
          value={value}
          onValueChange={setValue}
          aria-label="Nombre"
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    await user.type(input, "hola");
    expect(input).toHaveValue("hola");
  });

  it("controlado: onValueChange recibe el valor acumulado en cada pulsación", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <TextField
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
          aria-label="Nombre"
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    await user.type(input, "ab");
    expect(onValueChange).toHaveBeenCalledWith("a");
    expect(onValueChange).toHaveBeenCalledWith("ab");
  });

  it("no controlado (defaultValue): teclear actualiza el input sin value externo", async () => {
    const user = userEvent.setup();
    render(<TextField defaultValue="hola" aria-label="Nombre" />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toHaveValue("hola");
    await user.type(input, "!");
    expect(input).toHaveValue("hola!");
  });

  it("clearable: el botón aparece solo con contenido, limpia el valor y devuelve el foco", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();

    function Controlled() {
      const [value, setValue] = useState("hola");
      return (
        <TextField
          value={value}
          onValueChange={setValue}
          clearable
          onClear={onClear}
          aria-label="Nombre"
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    const clearButton = screen.getByRole("button", { name: /limpiar/i });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);
    expect(input).toHaveValue("");
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveFocus();
  });

  it("clearable: el botón NO aparece cuando el campo está vacío", () => {
    render(<TextField value="" onValueChange={() => {}} clearable aria-label="Nombre" />);
    expect(screen.queryByRole("button", { name: /limpiar/i })).not.toBeInTheDocument();
  });

  it("password: el toggle alterna visibilidad conservando la posición del cursor", async () => {
    const user = userEvent.setup();
    render(
      <TextField
        type="password"
        defaultValue="secreto123"
        revealPassword
        aria-label="Contraseña"
      />,
    );
    const input = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");

    input.focus();
    input.setSelectionRange(3, 3);

    const toggle = screen.getByRole("button", { name: /mostrar contraseña/i });
    await user.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);

    const hideToggle = screen.getByRole("button", { name: /ocultar contraseña/i });
    await user.click(hideToggle);
    expect(input).toHaveAttribute("type", "password");
  });

  it("reenvía ref al <input>", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField ref={ref} aria-label="Nombre" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("dentro de FormField (label + required): el input recibe aria-required y el id asociado al label", () => {
    render(
      <FormField label="Usuario" required>
        <TextField />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Usuario");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);
  });

  it("dentro de FormField con errorMessage: invalid del contexto se refleja en aria-invalid", () => {
    render(
      <FormField label="Usuario" errorMessage="Requerido">
        <TextField />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("classNames.input aparece en el input", () => {
    render(<TextField classNames={{ input: "font-mono" }} aria-label="Nombre" />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toHaveClass("font-mono");
  });

  it("readOnly y disabled producen data-readonly/data-disabled distintos", () => {
    const { rerender } = render(<TextField readOnly aria-label="Nombre" />);
    const input = screen.getByRole("textbox", { name: "Nombre" });
    expect(input).toHaveAttribute("data-readonly", "true");
    expect(input).not.toHaveAttribute("data-disabled");

    rerender(<TextField disabled aria-label="Nombre" />);
    // El input deshabilitado pierde el rol "textbox" accesible en algunos entornos,
    // así que lo localizamos por atributo directamente.
    const disabledInput = document.querySelector("input") as HTMLInputElement;
    expect(disabledInput).toHaveAttribute("data-disabled", "true");
    expect(disabledInput).not.toHaveAttribute("data-readonly");
  });
});
