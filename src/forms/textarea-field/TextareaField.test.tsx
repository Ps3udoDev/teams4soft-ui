import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "../form-field/FormField";
import { TextareaField } from "./TextareaField";

describe("TextareaField", () => {
  it("soporta texto vacío, multilínea y onValueChange integrado con FormField", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FormField.Root required invalid>
        <FormField.Label>Observaciones</FormField.Label>
        <FormField.Control>
          <TextareaField defaultValue="" onValueChange={onValueChange} placeholder="Detalle" />
        </FormField.Control>
        <FormField.Description>Máximo 500 caracteres</FormField.Description>
        <FormField.Error>Campo obligatorio</FormField.Error>
      </FormField.Root>,
    );

    const textarea = screen.getByRole("textbox", { name: /Observaciones/ });
    expect(textarea).toHaveValue("");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-required", "true");
    expect(textarea).toHaveAccessibleDescription(/Campo obligatorio/);

    await user.type(textarea, "Línea 1{Enter}Línea 2");
    expect(textarea).toHaveValue("Línea 1\nLínea 2");
    expect(onValueChange).toHaveBeenLastCalledWith("Línea 1\nLínea 2");
  });

  it("funciona con props label, description y errorMessage directas", () => {
    render(
      <TextareaField
        label="Comentarios"
        description="Nota interna"
        errorMessage="Texto demasiado corto"
        value="abc"
        onValueChange={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Comentarios" });
    expect(textarea).toHaveValue("abc");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Texto demasiado corto")).toBeInTheDocument();
  });
});
