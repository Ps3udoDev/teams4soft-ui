import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { entityLookupMessagesEs } from "./lookup-core.types";
import { useLookupNotices } from "./use-lookup-notices";

afterEach(cleanup);

type Api = ReturnType<typeof useLookupNotices>;
type Options = Parameters<typeof useLookupNotices>[0];
type NotFoundResult = Awaited<ReturnType<Api["showNotFound"]>>;

function setup(options: Partial<Options> = {}) {
  const ref: { current: Api | null } = { current: null };
  function Harness(props: Partial<Options>) {
    const api = useLookupNotices({ messages: entityLookupMessagesEs, ...props });
    ref.current = api;
    return <>{api.noticesElement}</>;
  }
  const view = render(<Harness {...options} />);
  return { api: () => ref.current!, view, Harness };
}

function track<T>(promise: Promise<T>) {
  const state: { value?: T; settled: boolean } = { settled: false };
  void promise.then((v) => { state.value = v; state.settled = true; });
  return state;
}

describe("useLookupNotices", () => {
  it("sin onCreateRequest muestra el aviso informativo y aceptar resuelve dismissed", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC")); });
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("No se encontró «ABC»");
    expect(screen.queryByRole("button", { name: "No" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(result.value).toBe("dismissed"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("notFoundMessage como función o nodo reemplaza el texto del aviso simple", async () => {
    const { api, view, Harness } = setup({ notFoundMessage: (q) => <b>Sin {q}</b> });
    act(() => { void api().showNotFound("X1"); });
    expect(await screen.findByText("Sin X1")).toBeInTheDocument();
    view.rerender(<Harness notFoundMessage={<i>Nada</i>} />);
    expect(screen.getByText("Nada")).toBeInTheDocument();
  });

  it("con onCreateRequest confirma, llama una vez y resuelve created", async () => {
    const user = userEvent.setup();
    const onCreateRequest = vi.fn();
    const { api } = setup({ onCreateRequest });
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC")); });
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("«ABC» no fue encontrado. ¿Desea crear uno nuevo?");
    await user.click(screen.getByRole("button", { name: "Sí, crear nuevo" }));
    await waitFor(() => expect(result.value).toBe("created"));
    expect(onCreateRequest).toHaveBeenCalledTimes(1);
    expect(onCreateRequest).toHaveBeenCalledWith("ABC");
  });

  it("No resuelve kept sin llamar onCreateRequest", async () => {
    const user = userEvent.setup();
    const onCreateRequest = vi.fn();
    const { api } = setup({ onCreateRequest });
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC")); });
    await user.click(await screen.findByRole("button", { name: "No" }));
    await waitFor(() => expect(result.value).toBe("kept"));
    expect(onCreateRequest).not.toHaveBeenCalled();
  });

  it("Escape en la confirmación equivale a No", async () => {
    const user = userEvent.setup();
    const onCreateRequest = vi.fn();
    const { api } = setup({ onCreateRequest });
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC")); });
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(result.value).toBe("kept"));
    expect(onCreateRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Escape en el aviso simple resuelve kept", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC")); });
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(result.value).toBe("kept"));
  });

  it("emptyMessage muestra ese nodo como aviso, ignora onCreateRequest y aceptar resuelve kept", async () => {
    const user = userEvent.setup();
    const onCreateRequest = vi.fn();
    const { api } = setup({ onCreateRequest });
    let result!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { result = track(api().showNotFound("ABC", <em>El proveedor existe pero no aplica</em>)); });
    expect(await screen.findByText("El proveedor existe pero no aplica")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "No" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(result.value).toBe("kept"));
    expect(onCreateRequest).not.toHaveBeenCalled();
  });

  it("showQueryRequired muestra el texto y resuelve al cerrar", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let result!: ReturnType<typeof track<void>>;
    act(() => { result = track(api().showQueryRequired()); });
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Ingrese un término de búsqueda para continuar.");
    expect(result.settled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(result.settled).toBe(true));
  });

  it("un segundo aviso resuelve el anterior como kept y lo reemplaza", async () => {
    const { api } = setup();
    let first!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { first = track(api().showNotFound("UNO")); });
    await screen.findByText("No se encontró «UNO»");
    act(() => { void api().showNotFound("DOS"); });
    await waitFor(() => expect(first.value).toBe("kept"));
    expect(screen.getByText("No se encontró «DOS»")).toBeInTheDocument();
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
  });

  it("al desmontar resuelve los avisos pendientes como kept", async () => {
    const { api, view } = setup();
    let notFound!: ReturnType<typeof track<NotFoundResult>>;
    act(() => { notFound = track(api().showNotFound("ABC")); });
    await screen.findByRole("alertdialog");
    view.unmount();
    await waitFor(() => expect(notFound.value).toBe("kept"));
  });

  it("usa el onCreateRequest más reciente", async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { api, view, Harness } = setup({ onCreateRequest: first });
    act(() => { void api().showNotFound("ABC"); });
    await screen.findByRole("alertdialog");
    view.rerender(<Harness onCreateRequest={second} />);
    await user.click(screen.getByRole("button", { name: "Sí, crear nuevo" }));
    expect(second).toHaveBeenCalledWith("ABC");
    expect(first).not.toHaveBeenCalled();
  });
});
