import type * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CheckboxField } from "./CheckboxField";

describe("CheckboxField", () => {
  it("alterna con click en el control y emite estado semántico booleano", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField label="Habilitado" onCheckedChange={onCheckedChange} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Habilitado" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("hace clic en el label para alternar (label asociado por htmlFor/id)", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Acepto" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByText("Acepto"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("expone data-state=indeterminate y aria-checked mixed", () => {
    render(<CheckboxField label="Parcial" checked="indeterminate" />);
    const control = screen.getByRole("checkbox", { name: "Parcial" });
    expect(control).toHaveAttribute("data-state", "indeterminate");
    expect(control).toHaveAttribute("aria-checked", "mixed");
  });

  it("asocia error vía aria-describedby y marca aria-invalid", () => {
    render(
      <CheckboxField label="Términos" invalid errorMessage="Requerido" />,
    );
    const control = screen.getByRole("checkbox", { name: "Términos" });
    expect(control).toHaveAttribute("aria-invalid", "true");
    const describedby = control.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(screen.getByText("Requerido")).toHaveAttribute("id", describedby!);
  });

  it("alterna con la tecla Space", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<CheckboxField label="Space" onCheckedChange={onCheckedChange} />);
    screen.getByRole("checkbox", { name: "Space" }).focus();
    await user.keyboard(" ");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("en modo no controlado alterna y refleja el estado en data-state", async () => {
    const user = userEvent.setup();
    render(<CheckboxField label="No controlado" defaultChecked />);
    const control = screen.getByRole("checkbox", { name: "No controlado" });
    expect(control).toHaveAttribute("data-state", "checked");

    await user.click(control);
    expect(control).toHaveAttribute("data-state", "unchecked");

    await user.click(control);
    expect(control).toHaveAttribute("data-state", "checked");
  });

  it("en modo controlado ignora el click si el consumidor no actualiza checked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <CheckboxField
        label="Controlado"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );
    const control = screen.getByRole("checkbox", { name: "Controlado" });

    await user.click(control);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // El estado lo manda el prop: sin actualización externa, no cambia.
    expect(control).toHaveAttribute("data-state", "unchecked");
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("envía su valor en un formulario nativo cuando está marcado", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <CheckboxField label="Acepto" name="terms" value="yes" defaultChecked />
        <button type="submit">Enviar</button>
      </form>,
    );

    const form = document.querySelector("form")!;
    // Radix renderiza un input oculto que participa en el envío nativo.
    expect(new FormData(form).get("terms")).toBe("yes");

    await user.click(screen.getByRole("checkbox", { name: "Acepto" }));
    expect(new FormData(form).get("terms")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("aplica classNames por slot y reenvía ref", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <CheckboxField
        label="Custom"
        ref={ref}
        classNames={{ control: "border-violet-500", label: "font-semibold" }}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByRole("checkbox", { name: "Custom" }).className).toContain(
      "border-violet-500",
    );
  });
});
