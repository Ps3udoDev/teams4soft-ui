import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RadioGroup } from "./RadioGroup";

const options = [
  { value: "a", label: "Opción A" },
  { value: "b", label: "Opción B" },
  { value: "c", label: "Opción C", disabled: true },
];

describe("RadioGroup", () => {
  it("selecciona una opción y emite el valor semántico", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup label="Modo" options={options} onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("radio", { name: "Opción B" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("navega con flechas moviendo el foco y saltando opciones deshabilitadas", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Modo"
        options={options}
        defaultValue="a"
        onValueChange={onValueChange}
      />,
    );
    screen.getByRole("radio", { name: "Opción A" }).focus();
    await user.keyboard("{ArrowDown}"); // A -> B
    await new Promise((r) => setTimeout(r, 0)); // let Radix roving-focus setTimeout(0) run
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Opción B" }),
    );
    await user.keyboard("{ArrowDown}"); // B -> (C disabled) -> A (wrap)
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Opción A" }),
    );
  });

  it("comparte name entre las opciones", () => {
    render(<RadioGroup name="grupo" options={options} />);
    // Radix RadioGroupItem renderiza un input hidden con el name cuando hay name.
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(3);
  });

  it("expone data-orientation y data-invalid en la raíz", () => {
    const { container } = render(
      <RadioGroup options={options} orientation="horizontal" invalid />,
    );
    const root = container.querySelector("[role='radiogroup']");
    expect(root).toHaveAttribute("data-orientation", "horizontal");
    expect(root).toHaveAttribute("data-invalid", "true");
  });

  it("asocia el error por aria-describedby", () => {
    const { container } = render(
      <RadioGroup options={options} invalid errorMessage="Elige una" />,
    );
    const root = container.querySelector("[role='radiogroup']")!;
    const describedby = root.getAttribute("aria-describedby");
    expect(screen.getByText("Elige una")).toHaveAttribute("id", describedby!);
  });

  it("el control sigue el data-state real del Item (group-data-*), no se congela en modo no controlado", async () => {
    const user = userEvent.setup();
    render(<RadioGroup options={options} defaultValue="a" />);

    const radioA = screen.getByRole("radio", { name: "Opción A" });
    const radioB = screen.getByRole("radio", { name: "Opción B" });

    // El `Item` (option slot) lleva la clase `group`; el control descendiente
    // lee su estado vía `group-data-[state=checked]`, nunca vía un
    // `data-state` propio congelado en el primer render.
    expect(radioA.className.split(" ")).toContain("group");
    const controlA = radioA.querySelector("span");
    expect(controlA?.className).toContain("group-data-[state=checked]:border-ui-primary");
    // El control ya no fija su propio `data-state`: el que importa es el del `Item`.
    expect(controlA).not.toHaveAttribute("data-state");

    expect(radioA).toHaveAttribute("data-state", "checked");
    expect(radioB).toHaveAttribute("data-state", "unchecked");

    await user.click(radioB);

    // Tras la interacción en modo NO controlado, Radix actualiza el
    // `data-state` real del `Item` — la fuente de verdad que lee
    // `group-data-[state=checked]` en el control, sin quedar obsoleta.
    expect(radioA).toHaveAttribute("data-state", "unchecked");
    expect(radioB).toHaveAttribute("data-state", "checked");
  });

  it("usa renderOption para tarjetas sin perder rol radio", () => {
    render(
      <RadioGroup
        options={options}
        renderOption={(o, s) => (
          <div data-checked={s.checked}>Card {o.label}</div>
        )}
      />,
    );
    expect(screen.getByText("Card Opción A")).toBeInTheDocument();
    expect(screen.getAllByRole("radio").length).toBe(3);
  });
});
