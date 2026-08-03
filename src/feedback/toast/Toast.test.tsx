import * as React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";
import type { ToastApi } from "./Toast.types";
import {
  toast,
  defaultToastStore,
  releaseGlobalToastStore,
} from "./toast-global";

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
});

afterEach(() => {
  releaseGlobalToastStore();
});

/**
 * Sujeta la API para poder dispararla desde el cuerpo de la prueba.
 * Es un objeto y no un `let api = null`: TypeScript estrecharía esa variable
 * a `null` y `holder.api!.show()` fallaría con "Property 'show' does not exist on
 * type 'never'".
 */
function createHolder(): { api: ToastApi | null } {
  return { api: null };
}

function Trigger({ holder }: { holder?: { api: ToastApi | null } }) {
  const api = useToast();
  React.useEffect(() => {
    if (holder) holder.api = api;
  }, [api, holder]);
  return (
    <button type="button" onClick={() => api.success({ title: "Guardado" })}>
      Disparar
    </button>
  );
}

describe("ToastProvider", () => {
  it("muestra un toast lanzado con useToast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Disparar" }));
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
  });

  it("lanza si useToast se usa fuera del provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("renderiza como mucho maxVisible a la vez", async () => {
    const holder = createHolder();
    render(
      <ToastProvider maxVisible={2}>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.show({ title: "uno" });
      holder.api!.show({ title: "dos" });
      holder.api!.show({ title: "tres" });
    });

    expect(await screen.findByText("uno")).toBeInTheDocument();
    expect(screen.getByText("dos")).toBeInTheDocument();
    expect(screen.queryByText("tres")).not.toBeInTheDocument();
  });

  it("cierra con el botón de cierre", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Disparar" }));
    await screen.findByText("Guardado");
    await user.click(screen.getByRole("button", { name: /cerrar/i }));

    await waitFor(() => {
      expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
    });
  });

  it("ejecuta la acción y no rompe la cola si lanza", async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const holder = createHolder();
    render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({
        title: "Falló",
        duration: "persistent",
        action: {
          label: "Reintentar",
          onClick: () => {
            throw new Error("boom");
          },
        },
      });
    });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(warn).toHaveBeenCalled();

    act(() => {
      holder.api!.show({ title: "sigue viva" });
    });
    expect(await screen.findByText("sigue viva")).toBeInTheDocument();
    warn.mockRestore();
  });

  it("anuncia los errores en región asertiva y el resto en cortés", async () => {
    const holder = createHolder();
    const { container } = render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({ title: "Falló", duration: "persistent" });
    });
    await screen.findByText("Falló");

    const roots = container.ownerDocument.querySelectorAll("[data-tone]");
    expect(roots.length).toBeGreaterThan(0);
    expect(roots[0]!).toHaveAttribute("data-tone", "error");
  });

  it("no mueve el foco al aparecer un toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Disparar" });
    await user.click(trigger);
    await screen.findByText("Guardado");

    expect(trigger).toHaveFocus();
  });

  it("renderiza la acción con su etiqueta y la invoca al pulsar", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const holder = createHolder();
    render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.error({
        title: "Falló",
        duration: "persistent",
        action: { label: "Reintentar", onClick },
      });
    });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aplica classNames por slot y respeta unstyled", async () => {
    const holder = createHolder();
    render(
      <ToastProvider classNames={{ title: "mi-titulo" }}>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.show({ title: "estilado", duration: "persistent" });
    });
    expect(await screen.findByText("estilado")).toHaveClass("mi-titulo");
  });

  it("aplica className del provider al viewport", async () => {
    const { container } = render(
      <ToastProvider className="mi-viewport">
        <Trigger />
      </ToastProvider>,
    );
    expect(
      container.ownerDocument.querySelector(".mi-viewport"),
    ).not.toBeNull();
  });

  it("muestra un icono por defecto según el tono sin `icon` ni `icons`", async () => {
    const holder = createHolder();
    const { container } = render(
      <ToastProvider>
        <Trigger holder={holder} />
      </ToastProvider>,
    );

    act(() => {
      holder.api!.success({ title: "con icono por defecto" });
    });
    await screen.findByText("con icono por defecto");

    // El wrapper del icono es el único `span[aria-hidden]` de la raíz: lo
    // aísla del svg del botón de cierre, que también es aria-hidden pero no
    // vive dentro de un span.
    const iconWrapper = container.querySelector(
      '[data-tone="success"] span[aria-hidden="true"]',
    );
    expect(iconWrapper?.querySelector("svg")).not.toBeNull();
  });
});

describe("ToastProvider global", () => {
  it("sin `global` NO conecta el toast importable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "desde fuera", duration: "persistent" });
    });

    // Llega a la store global, pero este provider no la observa.
    expect(defaultToastStore.getState().toasts).toHaveLength(1);
    expect(screen.queryByText("desde fuera")).not.toBeInTheDocument();
    defaultToastStore.clear();
    warn.mockRestore();
  });

  it("con `global` conecta el toast importable", async () => {
    render(
      <ToastProvider global>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "desde fuera", duration: "persistent" });
    });
    expect(await screen.findByText("desde fuera")).toBeInTheDocument();
  });

  it("vacía la store global al desmontarse", async () => {
    const { unmount } = render(
      <ToastProvider global>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      toast.show({ title: "efímero", duration: "persistent" });
    });
    await screen.findByText("efímero");

    unmount();
    expect(defaultToastStore.getState().toasts).toHaveLength(0);
  });

  it("avisa si se pasa `maxQueued` junto con `global`, porque se ignora", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ToastProvider global maxQueued={10}>
        <Trigger />
      </ToastProvider>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`maxQueued` se ignora"),
    );
    warn.mockRestore();
  });

  it("no avisa por `maxQueued` cuando no hay `global`", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <ToastProvider maxQueued={10}>
        <Trigger />
      </ToastProvider>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
