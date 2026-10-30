import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog";

afterEach(cleanup);

describe("Dialog", () => {
  it("aplica tamaños exactos y prioriza width", () => {
    const { rerender } = render(<Dialog open title="Tamaño" size="lg" />);
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "1000px", maxWidth: "95vw" });
    rerender(<Dialog open title="Tamaño" size="lg" width="640px" />);
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "640px" });
    rerender(<Dialog open title="Tamaño" />);
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "400px" });
  });

  it("enlaza description y reenvía el ref y atributos al contenido", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Dialog ref={ref} open title="Consulta" description="Selecciona un registro" data-testid="content" />);
    expect(ref.current).toBe(screen.getByTestId("content"));
    expect(ref.current).toHaveAccessibleDescription("Selecciona un registro");
  });

  it("al cerrar llama onOpenChange y onHide", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onHide = vi.fn();
    render(<Dialog open title="Consulta" onOpenChange={onOpenChange} onHide={onHide} />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onHide).toHaveBeenCalledOnce();
  });

  it("no cierra por overlay por defecto y sí cuando está permitido", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Dialog open title="Consulta" onOpenChange={onOpenChange} classNames={{ overlay: "test-overlay" }} />);
    await user.click(document.querySelector(".test-overlay")!);
    expect(onOpenChange).not.toHaveBeenCalled();
    rerender(<Dialog open title="Consulta" onOpenChange={onOpenChange} closeOnOverlayClick classNames={{ overlay: "test-overlay" }} />);
    await user.click(document.querySelector(".test-overlay")!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closable false oculta X e impide Escape", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Dialog open title="Consulta" closable={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("muestra un LoadingOverlay bloqueante sobre el body", () => {
    render(<Dialog open title="Consulta" loading loadingMessage="Cargando resultados" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-blocking", "true");
    expect(screen.getByRole("status")).toHaveAttribute("data-target", "container");
    expect(screen.getByRole("status")).toHaveTextContent("Cargando resultados");
  });

  it("enfoca initialFocusRef y devuelve el foco al disparador", async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = React.useState(false);
      const initial = React.useRef<HTMLInputElement>(null);
      return <><button onClick={() => setOpen(true)}>Abrir</button><Dialog open={open} onOpenChange={setOpen} title="Consulta" initialFocusRef={initial}><input aria-label="Primero" /><input ref={initial} aria-label="Segundo" /></Dialog></>;
    }
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "Segundo" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("sin initialFocusRef enfoca el primer campo y atrapa Tab", async () => {
    const user = userEvent.setup();
    render(<Dialog open title="Consulta"><input aria-label="Campo" /></Dialog>);
    expect(screen.getByRole("textbox")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it.each([false, true])("Escape solo cierra el superior (anidado: %s)", async (nested) => {
    const user = userEvent.setup();
    function Example() {
      const [first, setFirst] = React.useState(true);
      const [second, setSecond] = React.useState(false);
      const upper = <Dialog open={second} onOpenChange={setSecond} title="Alta"><input aria-label="Nombre" /></Dialog>;
      return <><Dialog open={first} onOpenChange={setFirst} title="Buscador"><button onClick={() => setSecond(true)}>Nueva alta</button>{nested && upper}</Dialog>{!nested && upper}</>;
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Nueva alta" }));
    expect(screen.getByRole("dialog", { name: "Alta" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Alta" })).toBeNull());
    expect(screen.getByRole("dialog", { name: "Buscador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva alta" })).toHaveFocus();
  });

  it("actualizar title o children no remonta ni pierde texto o foco", async () => {
    const mounts = vi.fn();
    const user = userEvent.setup();
    function Field({ label }: { label: string }) {
      React.useEffect(() => { mounts(); }, []);
      return <label>{label}<input aria-label="Consulta" /></label>;
    }
    const { rerender } = render(<Dialog open title="Cargando"><Field label="Antes" /></Dialog>);
    const input = screen.getByRole("textbox");
    await user.type(input, "persistente");
    rerender(<Dialog open title="Resultados"><Field label="Después" /></Dialog>);
    expect(mounts).toHaveBeenCalledOnce();
    expect(input).toHaveValue("persistente");
    expect(input).toHaveFocus();
  });

  it("after-animation difiere onHide hasta terminar la salida", async () => {
    const user = userEvent.setup();
    const onHide = vi.fn();
    function Example() {
      const [open, setOpen] = React.useState(true);
      return <Dialog open={open} onOpenChange={setOpen} onHide={onHide} title="Salida" hideMode="after-animation" />;
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(onHide).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("after-animation conserva el contenido cuando el consumidor cierra desde el footer", async () => {
    const user = userEvent.setup();
    const onHide = vi.fn();
    function Example() {
      const [open, setOpen] = React.useState(true);
      return <Dialog open={open} title="Guardar" onHide={onHide} hideMode="after-animation" footer={<button onClick={() => setOpen(false)}>Guardar cambios</button>}><input defaultValue="Borrador" /></Dialog>;
    }
    render(<Example />);
    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("textbox");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("data-state", "closed");
    expect(input).toBeInTheDocument();
    expect(onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(onHide).toHaveBeenCalledOnce());
    expect(dialog).not.toBeInTheDocument();
  });

  it("onHide sin onOpenChange cierra visualmente y notifica después de la salida", async () => {
    const user = userEvent.setup();
    const onHide = vi.fn();
    render(<Dialog open title="Compatibilidad" onHide={onHide} hideMode="after-animation" />);
    const dialog = screen.getByRole("dialog");
    await user.keyboard("{Escape}");
    expect(dialog).toHaveAttribute("data-state", "closed");
    expect(onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(onHide).toHaveBeenCalledOnce());
    expect(dialog).not.toBeInTheDocument();
  });

  it("reabrir durante la salida cancela onHide y conserva el contenido", async () => {
    const onHide = vi.fn();
    const { rerender } = render(<Dialog open title="Reabrir" onHide={onHide} hideMode="after-animation"><input defaultValue="Borrador" /></Dialog>);
    const input = screen.getByRole("textbox");
    rerender(<Dialog open={false} title="Reabrir" onHide={onHide} hideMode="after-animation"><input defaultValue="Borrador" /></Dialog>);
    rerender(<Dialog open title="Reabrir" onHide={onHide} hideMode="after-animation"><input defaultValue="Borrador" /></Dialog>);
    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(onHide).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBe(input);
  });

  it("autofocus omite campos hidden, CSS ocultos e inert antes del campo visible", () => {
    render(<Dialog open title="Foco seguro">
      <div hidden><input aria-label="Oculto por atributo" /></div>
      <div style={{ display: "none" }}><input aria-label="Oculto por CSS" /></div>
      <div inert><input aria-label="Inerte" /></div>
      <input aria-label="Visible" />
    </Dialog>);
    expect(screen.getByRole("textbox", { name: "Visible" })).toHaveFocus();
  });

  it("initialFocusRef que no puede enfocar permite el fallback de Radix", () => {
    const initial = React.createRef<HTMLDivElement>();
    render(<Dialog open title="Fallback" initialFocusRef={initial}><div ref={initial}>Texto sin tabIndex</div></Dialog>);
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  });
});
