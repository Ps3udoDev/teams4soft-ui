import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { FormField } from "./FormField";

afterEach(() => {
  cleanup();
});

describe("FormField (API de conveniencia)", () => {
  it("el label se asocia al control por htmlFor/id: clic en el label enfoca el input", async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Correo">
        <input type="text" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Correo");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", input.id);

    await user.click(label);
    expect(input).toHaveFocus();
  });

  it("con errorMessage: aria-invalid='true' y aria-describedby incluye el id del error", () => {
    render(
      <FormField label="Correo" errorMessage="Correo inválido">
        <input type="text" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const errorNode = screen.getByText("Correo inválido");
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    expect(describedBy).toContain(errorNode.id);
  });

  it("con description (sin error): aria-describedby incluye el id de la descripción y NO uno de error inexistente", () => {
    render(
      <FormField
        label="Correo"
        description="Usaremos este correo para notificaciones."
      >
        <input type="text" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    const descriptionNode = screen.getByText(
      "Usaremos este correo para notificaciones.",
    );
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain(descriptionNode.id);
    expect(describedBy).not.toMatch(/error/);
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("required agrega aria-required='true' y un indicador con texto accesible", () => {
    render(
      <FormField label="Correo" required>
        <input type="text" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("(requerido)")).toBeInTheDocument();
  });

  it("optional agrega un indicador informativo visible", () => {
    render(
      <FormField label="Teléfono" optional>
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
  });

  it("disabled propaga disabled al control y data-disabled='true' en la raíz", () => {
    const { container } = render(
      <FormField label="Correo" disabled>
        <input type="text" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-disabled", "true");
  });

  it("classNames.error='text-red-700' aparece en el nodo de error", () => {
    render(
      <FormField
        label="Correo"
        errorMessage="Correo inválido"
        classNames={{ error: "text-red-700" }}
      >
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByText("Correo inválido")).toHaveClass("text-red-700");
  });

  it("el error reemplaza visualmente a la descripción cuando ambos están presentes", () => {
    render(
      <FormField
        label="Correo"
        description="Usaremos este correo para notificaciones."
        errorMessage="Correo inválido"
      >
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByText("Correo inválido")).toBeInTheDocument();
    expect(
      screen.queryByText("Usaremos este correo para notificaciones."),
    ).not.toBeInTheDocument();
  });

  it("unstyled conserva ids/aria pero omite las clases visuales del root", () => {
    const { container } = render(
      <FormField label="Correo" unstyled required>
        <input type="text" />
      </FormField>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/grid/);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("FormField gestiona el id del control: sobrescribe un id explícito del hijo para que <label for> siempre coincida", async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Correo">
        <input type="text" id="custom-id" />
      </FormField>,
    );
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Correo");

    // El id que expone FormField gana: la asociación label/control nunca
    // queda colgante, sin importar qué id traiga el hijo.
    expect(input.id).not.toBe("custom-id");
    expect(label.getAttribute("for")).toBe(input.id);

    await user.click(label);
    expect(input).toHaveFocus();
  });
});

describe("FormField (API compuesta)", () => {
  it("Root+Label+Control+Error produce las mismas asociaciones que la API de conveniencia", () => {
    render(
      <FormField.Root>
        <FormField.Label>Correo</FormField.Label>
        <FormField.Control>
          <input type="text" />
        </FormField.Control>
        <FormField.Error>Correo inválido</FormField.Error>
      </FormField.Root>,
    );

    const input = screen.getByRole("textbox");
    const label = screen.getByText("Correo");
    expect(label).toHaveAttribute("for", input.id);
    expect(input).toHaveAttribute("aria-invalid", "true");

    const errorNode = screen.getByText("Correo inválido");
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    expect(describedBy).toContain(errorNode.id);
  });

  it("Root+Label+Control+Description asocia aria-describedby sin id de error", () => {
    render(
      <FormField.Root>
        <FormField.Label>Correo</FormField.Label>
        <FormField.Control>
          <input type="text" />
        </FormField.Control>
        <FormField.Description>
          Usaremos este correo para notificaciones.
        </FormField.Description>
      </FormField.Root>,
    );

    const input = screen.getByRole("textbox");
    const descriptionNode = screen.getByText(
      "Usaremos este correo para notificaciones.",
    );
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(" ")).toContain(descriptionNode.id);
    expect(describedBy).not.toMatch(/error/);
  });

  it("Root disabled propaga disabled al control y data-disabled en la raíz", () => {
    const { container } = render(
      <FormField.Root disabled>
        <FormField.Label>Correo</FormField.Label>
        <FormField.Control>
          <input type="text" />
        </FormField.Control>
      </FormField.Root>,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(container.firstElementChild).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("un FormField.Error anidado (envuelto en un <div>) se sigue detectando: aria-invalid, aria-describedby, y suprime una Description hermana", () => {
    render(
      <FormField.Root>
        <FormField.Label>Correo</FormField.Label>
        <FormField.Control>
          <input type="text" />
        </FormField.Control>
        <FormField.Description>
          Usaremos este correo para notificaciones.
        </FormField.Description>
        <div className="flex items-center gap-1">
          <span aria-hidden="true">!</span>
          <FormField.Error>Correo inválido</FormField.Error>
        </div>
      </FormField.Root>,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const errorNode = screen.getByText("Correo inválido");
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(
      " ",
    );
    expect(describedBy).toContain(errorNode.id);

    // El error (aunque anidado) sigue reemplazando a la descripción.
    expect(
      screen.queryByText("Usaremos este correo para notificaciones."),
    ).not.toBeInTheDocument();
  });

  it("useFormFieldContext() devuelve null fuera de un FormField", async () => {
    const { useFormFieldContext } = await import("./FormField");
    let observed: unknown = "not-called";
    function Probe() {
      observed = useFormFieldContext();
      return null;
    }
    render(<Probe />);
    expect(observed).toBeNull();
  });
});
