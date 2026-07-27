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
