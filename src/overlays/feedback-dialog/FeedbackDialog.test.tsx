import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackDialog } from "./FeedbackDialog";
import type { FeedbackDialogProps } from "./FeedbackDialog.types";

afterEach(cleanup);

function Controlled(props: Omit<FeedbackDialogProps, "open">) {
  const [open, setOpen] = React.useState(true);
  return <FeedbackDialog {...props} open={open} onOpenChange={setOpen} />;
}

describe("FeedbackDialog", () => {
  it("usa alertdialog, título Aviso y botones por defecto", async () => {
    render(<FeedbackDialog open message="¿Continuar?" showReject />);
    expect(screen.getByRole("alertdialog", { name: "Aviso" })).toHaveAccessibleDescription("¿Continuar?");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Aceptar" })).toHaveFocus());
  });

  it.each([
    ["info", "text-ui-info"],
    ["warn", "text-ui-warning"],
    ["success", "text-ui-success"],
    ["danger", "text-ui-danger"],
  ] as const)("el icono de severidad %s usa su token y los botones siguen en primary", (severity, iconClass) => {
    render(<FeedbackDialog open message="Mensaje" severity={severity} showReject classNames={{ icon: "test-icon" }} />);
    const icon = document.querySelector(".test-icon")!;
    expect(icon).toHaveClass(iconClass);
    expect(icon.className).not.toMatch(/\b(blue|amber|emerald)-\d/);
    for (const name of ["Aceptar", "Cancelar"]) {
      expect(screen.getByRole("button", { name }).className).not.toMatch(/ui-(info|warning|success)/);
    }
  });

  it("aceptar llama una sola vez a onOpenChange(false) y nunca a onReject", async () => {
    const onOpenChange = vi.fn();
    const onReject = vi.fn();
    render(<FeedbackDialog open message="Continuar" showReject onOpenChange={onOpenChange} onReject={onReject} />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onReject).not.toHaveBeenCalled();
  });

  it("cerrar desde el padre no llama a onReject ni a onOpenChange", () => {
    const onOpenChange = vi.fn();
    const onReject = vi.fn();
    const { rerender } = render(<FeedbackDialog open message="Continuar" showReject onOpenChange={onOpenChange} onReject={onReject} />);
    rerender(<FeedbackDialog open={false} message="Continuar" showReject onOpenChange={onOpenChange} onReject={onReject} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("oculta Rechazar por defecto", () => {
    render(<FeedbackDialog open message="Listo" />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("aceptar ejecuta callback y cierra", async () => {
    const onAccept = vi.fn();
    render(<Controlled message="Continuar" onAccept={onAccept} />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(onAccept).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it.each(["X", "Escape", "Cancelar"])("%s rechaza una vez y cierra", async (action) => {
    const onReject = vi.fn();
    render(<Controlled message="Continuar" showReject onReject={onReject} />);
    if (action === "Escape") await userEvent.keyboard("{Escape}");
    else await userEvent.click(screen.getByRole("button", { name: action === "X" ? "Cerrar" : action }));
    expect(onReject).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it.each(["danger", "error"] as const)("%s coloca foco inicial en Rechazar", async (severity) => {
    render(<FeedbackDialog open message="Eliminar" showReject severity={severity} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus());
    expect(screen.getByRole("alertdialog")).toHaveAttribute("data-severity", "danger");
  });

  it("mientras onAccept está pendiente deshabilita Aceptar y evita duplicados", async () => {
    let resolve!: () => void;
    const onAccept = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    render(<Controlled message="Guardar" onAccept={onAccept} />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    const loadingButton = screen.getByRole("button", { name: "Cargando" });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("data-loading");
    await userEvent.click(loadingButton);
    expect(onAccept).toHaveBeenCalledOnce();
    await act(async () => { resolve(); });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("si onAccept rechaza sigue abierto, habilita Aceptar y permite reintentar", async () => {
    let reject!: (reason: Error) => void;
    const onAccept = vi.fn().mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; })).mockResolvedValue(undefined);
    render(<Controlled message="Guardar" onAccept={onAccept} />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    await act(async () => { reject(new Error("No se pudo guardar")); });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onAccept).toHaveBeenCalledTimes(2);
  });

  it("una aceptación antigua no cierra una sesión reabierta", async () => {
    let resolve!: () => void;
    const onAccept = () => new Promise<void>((done) => { resolve = done; });
    const onOpenChange = vi.fn();
    const { rerender } = render(<FeedbackDialog open message="Uno" onAccept={onAccept} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    rerender(<FeedbackDialog open={false} message="Uno" onAccept={onAccept} onOpenChange={onOpenChange} />);
    rerender(<FeedbackDialog open message="Dos" onAccept={onAccept} onOpenChange={onOpenChange} />);
    await act(async () => { resolve(); });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Dos");
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled();
  });

  it("preserva saltos de línea y permite mensajes personalizados", () => {
    render(<FeedbackDialog open message={"Primera\nSegunda"} showReject messages={{ title: "Confirmación", accept: "Sí", reject: "No" }} />);
    expect(screen.getByRole("alertdialog", { name: "Confirmación" })).toBeInTheDocument();
    const message = screen.getByText(/Primera/);
    expect(message.textContent).toBe("Primera\nSegunda");
    expect(message).toHaveClass("whitespace-pre-line");
    expect(screen.getByRole("button", { name: "Sí" })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: "No" })).toHaveAttribute("data-variant", "outline");
  });

  it("notice usa 36rem y solo Aceptar; confirm usa 30rem", () => {
    const { rerender } = render(<FeedbackDialog open variant="notice" message="Resultado" showReject />);
    expect(screen.getByRole("alertdialog")).toHaveStyle({ width: "36rem" });
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    rerender(<FeedbackDialog open message="Resultado" />);
    expect(screen.getByRole("alertdialog")).toHaveStyle({ width: "30rem" });
  });

  it("propaga ref, atributos y personalización de slots", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<FeedbackDialog open ref={ref} message="Contenido" data-testid="feedback" unstyled classNames={{ root: "custom-root", message: "custom-message" }} styles={{ message: { color: "red" } }} />);
    expect(ref.current).toBe(screen.getByTestId("feedback"));
    expect(ref.current).toHaveClass("custom-root");
    expect(screen.getByText("Contenido")).toHaveClass("custom-message");
    expect(screen.getByText("Contenido")).not.toHaveClass("whitespace-pre-line");
    expect(screen.getByText("Contenido")).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });
});
