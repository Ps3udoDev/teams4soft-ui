import * as React from "react";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "../dialog/Dialog";
import { FeedbackDialogProvider } from "./FeedbackDialogProvider";
import { confirm, notify, releaseGlobalFeedbackDialogStore } from "./feedback-dialog-global";

afterEach(() => {
  cleanup();
  releaseGlobalFeedbackDialogStore();
  vi.restoreAllMocks();
});

describe("FeedbackDialogProvider", () => {
  it("accepts a notification from a child passive effect on mount", async () => {
    function Child() {
      React.useEffect(() => { void notify.info("Mounted child"); }, []);
      return null;
    }
    render(<FeedbackDialogProvider global><Child /></FeedbackDialogProvider>);
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Mounted child");
  });

  it("accepts two queued confirmations and initializes focus for each", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialogProvider global />);
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = confirm({ title: "First", message: "one", showReject: true });
      second = confirm({ title: "Second", message: "two", showReject: true, severity: "danger" });
    });
    expect(screen.getByRole("alertdialog", { name: "First" })).toBeInTheDocument();
    expect(screen.queryByText("two")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(first).resolves.toBe(true);
    expect(await screen.findByRole("alertdialog", { name: "Second" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(second).resolves.toBe(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("accepting a confirm resolves true once, never calls onReject and shows the next notice", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const settled = vi.fn();
    render(<FeedbackDialogProvider global />);
    let first!: Promise<boolean>;
    let second!: Promise<void>;
    act(() => {
      first = confirm({ title: "Eliminar", message: "¿Eliminar?", showReject: true, onAccept, onReject });
      first.then(settled);
      second = notify.success("Eliminado", { title: "Listo" });
    });
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(first).resolves.toBe(true);
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onReject).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog", { name: "Listo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(second).resolves.toBeUndefined();
    expect(settled).toHaveBeenCalledOnce();
    expect(settled).toHaveBeenCalledWith(true);
    expect(onReject).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it.each(["close", "escape"])("settles false on %s and invokes onReject once", async (action) => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<FeedbackDialogProvider global />);
    let result!: Promise<boolean>;
    act(() => { result = confirm({ message: "question", onReject }); });
    if (action === "close") await user.click(screen.getByRole("button", { name: "Cerrar" }));
    else await user.keyboard("{Escape}");
    await expect(result).resolves.toBe(false);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("renders notify.error as a notice and resolves when dismissed", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialogProvider global />);
    let result!: Promise<void>;
    act(() => { result = notify.error("Failure", { title: "Error" }); });
    const dialog = screen.getByRole("alertdialog", { name: "Error" });
    expect(dialog).toHaveAttribute("data-severity", "danger");
    expect(within(dialog).getByText("Failure")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Aceptar" }));
    await expect(result).resolves.toBeUndefined();
  });

  it("does not settle confirmation if asynchronous acceptance fails", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn().mockRejectedValueOnce(new Error("failed")).mockResolvedValue(undefined);
    const settled = vi.fn();
    render(<FeedbackDialogProvider global />);
    let result!: Promise<boolean>;
    act(() => { result = confirm({ message: "retry", onAccept }); });
    void result.then(settled);
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled();
    expect(settled).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(result).resolves.toBe(true);
  });

  it("ignores completion of an acceptance abandoned through Escape", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onAccept = () => new Promise<void>((resolve) => { finish = resolve; });
    render(<FeedbackDialogProvider global />);
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = confirm({ title: "First", message: "one", onAccept });
      second = confirm({ title: "Second", message: "two" });
    });
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.keyboard("{Escape}");
    await expect(first).resolves.toBe(false);
    await act(async () => { finish(); });
    expect(screen.getByRole("alertdialog", { name: "Second" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(second).resolves.toBe(true);
  });

  it("Escape closes only feedback above a Dialog and returns focus inside it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    let result!: Promise<boolean>;
    render(<FeedbackDialogProvider global>
      <Dialog open title="Search" onOpenChange={onOpenChange}>
        <button onClick={() => { result = confirm({ message: "No results" }); }}>Search records</button>
      </Dialog>
    </FeedbackDialogProvider>);
    const search = screen.getByRole("button", { name: "Search records" });
    await user.click(search);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await expect(result).resolves.toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Search" })).toBeInTheDocument();
    await waitFor(() => expect(search).toHaveFocus());
  });

  it("does not duplicate dialogs with two global providers and settles requests on unmount", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = render(<><FeedbackDialogProvider global /><FeedbackDialogProvider global /></>);
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = confirm({ message: "one" });
      second = confirm({ message: "two" });
    });
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    view.unmount();
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    expect(() => confirm({ message: "after unmount" })).toThrow();
  });

  it("claims the global slot safely under StrictMode", async () => {
    const user = userEvent.setup();
    render(<React.StrictMode><FeedbackDialogProvider global /></React.StrictMode>);
    let result!: Promise<boolean>;
    act(() => { result = confirm({ message: "strict" }); });
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await expect(result).resolves.toBe(true);
  });
});
