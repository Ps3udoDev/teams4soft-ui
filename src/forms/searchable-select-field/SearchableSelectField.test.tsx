import * as React from "react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelectField } from "./SearchableSelectField";

// Radix Popover usa APIs de puntero y scroll que jsdom no implementa.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
});

interface Country {
  code: string;
  name: string;
  aliases?: string[];
  blocked?: boolean;
}

const countries: Country[] = [
  { code: "US", name: "Estados Unidos", aliases: ["USA"] },
  { code: "MX", name: "México" },
  { code: "PE", name: "Perú", blocked: true },
  { code: "EC", name: "Ecuador" },
];

function Controlled({
  initial = null,
  onChange,
  options = countries,
  ...rest
}: {
  initial?: string | null;
  onChange?: (value: string | null, option: Country | null) => void;
  options?: Country[];
} & Partial<
  Omit<
    React.ComponentProps<typeof SearchableSelectField<Country, string>>,
    "value" | "onValueChange" | "options"
  >
>) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <SearchableSelectField<Country, string>
      label="País"
      options={options}
      getOptionValue={(option) => option.code}
      getOptionLabel={(option) => option.name}
      getOptionKeywords={(option) => option.aliases ?? []}
      getOptionDisabled={(option) => Boolean(option.blocked)}
      value={value}
      onValueChange={(next, option) => {
        setValue(next);
        onChange?.(next, option);
      }}
      {...rest}
    />
  );
}

async function openListbox(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /abrir opciones/i }));
  return screen.findByRole("listbox");
}

describe("SearchableSelectField — filtrado", () => {
  it("filtra por subcadena sin distinguir diacríticos ni mayúsculas", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByRole("combobox");
    await user.type(input, "mexi");

    await screen.findByRole("listbox");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("México");
  });

  it("encuentra por palabras clave sin ensuciar la etiqueta", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("combobox"), "usa");
    await screen.findByRole("listbox");
    expect(screen.getByRole("option")).toHaveTextContent("Estados Unidos");
  });

  it("muestra emptyMessage cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    render(<Controlled emptyMessage="Sin resultados" />);

    await user.type(screen.getByRole("combobox"), "zzz");
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("nunca muta el arreglo de opciones", async () => {
    const user = userEvent.setup();
    const source = [...countries];
    const snapshot = source.map((option) => option.code).join(",");
    render(
      <Controlled
        options={source}
        sortOptions={(a, b) => a.name.localeCompare(b.name)}
      />,
    );

    await openListbox(user);
    expect(source.map((option) => option.code).join(",")).toBe(snapshot);
    // El orden ordenado sí se refleja en la lista visible.
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Ecuador");
  });
});

describe("SearchableSelectField — selección", () => {
  it("ArrowDown abre y activa la primera opción habilitada", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByRole("combobox");
    input.focus();
    await user.keyboard("{ArrowDown}");

    await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    const active = document.getElementById(
      input.getAttribute("aria-activedescendant")!,
    );
    expect(active).toHaveTextContent("Estados Unidos");
  });

  it("Enter confirma la opción activa y emite value + option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole("combobox");
    input.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(
      "MX",
      expect.objectContaining({ code: "MX" }),
    );
    expect(input).toHaveValue("México");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("salta las opciones deshabilitadas al navegar y no las selecciona", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const listbox = await openListbox(user);
    const blocked = screen.getByRole("option", { name: "Perú" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    await user.click(blocked);
    expect(onChange).not.toHaveBeenCalled();
    expect(listbox).toBeInTheDocument();

    screen.getByRole("combobox").focus();
    // US → MX → (PE deshabilitada) → EC
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    const active = document.getElementById(
      screen.getByRole("combobox").getAttribute("aria-activedescendant")!,
    );
    expect(active).toHaveTextContent("Ecuador");
  });

  it("no pierde pasos cuando varias flechas se procesan en el mismo lote", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByRole("combobox");
    input.focus();

    // Primera flecha aparte: abre la lista y activa "Estados Unidos".
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    expect(
      document.getElementById(input.getAttribute("aria-activedescendant")!),
    ).toHaveTextContent("Estados Unidos");

    // Las dos siguientes van dentro de un único `act`, así que React las
    // procesa en el mismo lote y NO re-renderiza entre ellas. Es lo que ocurre
    // al mantener pulsada la flecha (key repeat), y es lo que destapó la CI:
    // si el handler lee `activeIndex` del closure en vez de usar el
    // actualizador funcional, la segunda parte de un valor obsoleto y se
    // queda en "México".
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
    });

    // US -> MX -> (PE deshabilitada, se salta) -> EC
    const active = document.getElementById(
      input.getAttribute("aria-activedescendant")!,
    );
    expect(active).toHaveTextContent("Ecuador");
  });

  it("selecciona con clic y cierra", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await openListbox(user);
    await user.click(screen.getByRole("option", { name: "Ecuador" }));

    expect(onChange).toHaveBeenCalledWith(
      "EC",
      expect.objectContaining({ code: "EC" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("no selecciona implícitamente sin autoSelectFirst", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "ecu");
    await screen.findByRole("listbox");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("autoSelectFirst activa la primera opción visible al filtrar", async () => {
    const user = userEvent.setup();
    render(<Controlled autoSelectFirst />);

    const input = screen.getByRole("combobox");
    await user.type(input, "e");
    await screen.findByRole("listbox");
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-activedescendant");
    });
  });

  it("sincroniza un cambio externo de value", () => {
    const noop = () => {};
    const props = {
      label: "País",
      options: countries,
      getOptionValue: (option: Country) => option.code,
      getOptionLabel: (option: Country) => option.name,
      onValueChange: noop,
    };
    const { rerender } = render(
      <SearchableSelectField<Country, string> {...props} value={null} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("");

    rerender(<SearchableSelectField<Country, string> {...props} value="MX" />);
    expect(screen.getByRole("combobox")).toHaveValue("México");
  });
});

describe("SearchableSelectField — resolución de texto", () => {
  it("resuelve por etiqueta exacta al confirmar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "ecuador{Enter}");
    expect(onChange).toHaveBeenCalledWith(
      "EC",
      expect.objectContaining({ code: "EC" }),
    );
  });

  it("show-error conserva el texto y marca el campo sin borrar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "zzz{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("zzz");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("revert restaura la etiqueta del valor vigente", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled initial="MX" onChange={onChange} unmatchedBehavior="revert" />,
    );

    const input = screen.getByRole("combobox");
    await user.clear(input);
    await user.type(input, "zzz{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("México");
  });

  it("clear emite null cuando el texto no resuelve", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled initial="MX" onChange={onChange} unmatchedBehavior="clear" />,
    );

    const input = screen.getByRole("combobox");
    await user.clear(input);
    await user.type(input, "zzz{Enter}");

    expect(onChange).toHaveBeenCalledWith(null, null);
  });

  it("Escape cierra y restaura el texto confirmado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="MX" onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "zz");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    expect(input).toHaveValue("México");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("vaciar el texto y confirmar limpia la selección si es clearable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="MX" onChange={onChange} clearable />);

    const input = screen.getByRole("combobox");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith(null, null);
  });
});

describe("SearchableSelectField — accesibilidad y personalización", () => {
  it("expone el patrón ARIA de combobox + listbox", async () => {
    const user = userEvent.setup();
    render(<Controlled initial="MX" />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "false");

    const listbox = await openListbox(user);
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(screen.getByRole("option", { name: "México" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Ecuador" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("conecta descripción y error con aria-describedby", () => {
    const noop = () => {};
    const props = {
      label: "País",
      options: countries,
      getOptionValue: (option: Country) => option.code,
      getOptionLabel: (option: Country) => option.name,
      onValueChange: noop,
      value: null,
    };
    const { rerender } = render(
      <SearchableSelectField<Country, string>
        {...props}
        description="Elige un país"
      />,
    );
    const input = screen.getByRole("combobox");
    expect(
      document.getElementById(input.getAttribute("aria-describedby")!),
    ).toHaveTextContent("Elige un país");

    rerender(
      <SearchableSelectField<Country, string>
        {...props}
        description="Elige un país"
        errorMessage="Campo requerido"
      />,
    );
    const withError = screen.getByRole("combobox");
    expect(
      document.getElementById(withError.getAttribute("aria-describedby")!),
    ).toHaveTextContent("Campo requerido");
    expect(screen.queryByText("Elige un país")).not.toBeInTheDocument();
    expect(withError).toHaveAttribute("aria-invalid", "true");
  });

  it("limpia la selección con el botón de limpiar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="MX" onChange={onChange} clearable />);

    await user.click(screen.getByRole("button", { name: /limpiar/i }));
    expect(onChange).toHaveBeenCalledWith(null, null);
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("no abre ni edita en readOnly ni disabled", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Controlled initial="MX" readOnly />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    rerender(<Controlled initial="MX" disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("muestra loadingMessage mientras carga", async () => {
    const user = userEvent.setup();
    render(<Controlled loading loadingMessage="Cargando…" />);

    await openListbox(user);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("renderOption personaliza el contenido conservando la semántica", async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        renderOption={(option) => <span>{`${option.code} · ${option.name}`}</span>}
      />,
    );

    await openListbox(user);
    const option = screen.getByRole("option", { name: "EC · Ecuador" });
    expect(option).toHaveAttribute("aria-selected", "false");
  });

  it("aplica classNames por slot y respeta unstyled", () => {
    const { container, rerender } = render(
      <Controlled className="mi-raiz" classNames={{ input: "mi-input" }} />,
    );
    expect(container.firstElementChild).toHaveClass("mi-raiz");
    expect(screen.getByRole("combobox")).toHaveClass("mi-input");

    rerender(<Controlled unstyled className="solo-esta" />);
    expect(container.firstElementChild?.className).toBe("solo-esta");
  });

  it("reenvía inputRef al input", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Controlled inputRef={ref} />);
    expect(ref.current).toBe(screen.getByRole("combobox"));
  });
});
