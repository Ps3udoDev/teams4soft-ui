import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";
import type { ToastPosition, ToastTone } from "./Toast.types";

const buttonClassName =
  "rounded-(--radius-ui-sm) border border-ui-border px-3 py-1.5 text-sm text-ui-foreground outline-none hover:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus";

const meta: Meta<typeof ToastProvider> = {
  title: "Feedback/Toast",
  component: ToastProvider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Cola de notificaciones efímeras construida sobre Radix Toast. Cada historia monta su propio `ToastProvider` (sin `global`) para que los ejemplos no compartan estado entre sí; el `toast` importable requiere `<ToastProvider global />`, documentado aparte.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ToastProvider>;

// --- Tones -------------------------------------------------------------

const tones: { tone: ToastTone; label: string }[] = [
  { tone: "success", label: "Éxito" },
  { tone: "error", label: "Error" },
  { tone: "warning", label: "Advertencia" },
  { tone: "info", label: "Información" },
  { tone: "neutral", label: "Neutral" },
];

function TonesDemo() {
  const api = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {tones.map(({ tone, label }) => (
        <button
          key={tone}
          type="button"
          className={buttonClassName}
          onClick={() =>
            api.show({
              tone,
              title: label,
              message: `Toast de tono "${tone}".`,
            })
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const Tones: Story = {
  render: () => (
    <ToastProvider>
      <TonesDemo />
    </ToastProvider>
  ),
};

// --- WithAction ----------------------------------------------------------

function WithActionDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() =>
        api.error({
          title: "No se pudo guardar",
          message: "Revisa tu conexión e inténtalo de nuevo.",
          duration: "persistent",
          action: { label: "Reintentar", onClick: () => {} },
        })
      }
    >
      Disparar con acción
    </button>
  );
}

export const WithAction: Story = {
  render: () => (
    <ToastProvider>
      <WithActionDemo />
    </ToastProvider>
  ),
};

// --- Persistent ------------------------------------------------------------

function PersistentDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() =>
        api.warning({
          title: "Sesión por expirar",
          message: "Este mensaje no se cierra solo: ciérralo con el botón.",
          duration: "persistent",
        })
      }
    >
      Mostrar persistente
    </button>
  );
}

export const Persistent: Story = {
  render: () => (
    <ToastProvider>
      <PersistentDemo />
    </ToastProvider>
  ),
};

// --- Queue -------------------------------------------------------------

function QueueDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => {
        for (let index = 1; index <= 6; index += 1) {
          api.show({ title: `Mensaje ${index}` });
        }
      }}
    >
      Lanzar 6 toasts (máx. 2 visibles)
    </button>
  );
}

export const Queue: Story = {
  render: () => (
    <ToastProvider maxVisible={2}>
      <QueueDemo />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "`maxVisible` limita cuántos se pintan a la vez; el resto espera su turno en la cola sin perderse.",
      },
    },
  },
};

// --- Deduplication -----------------------------------------------------

function DeduplicationDemo() {
  const api = useToast();
  const countRef = React.useRef(0);
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => {
        countRef.current += 1;
        api.info({
          dedupeKey: "sync-status",
          title: `Sincronizando… (${countRef.current})`,
          duration: "persistent",
        });
      }}
    >
      Sincronizar (varios clics, un solo toast)
    </button>
  );
}

export const Deduplication: Story = {
  render: () => (
    <ToastProvider>
      <DeduplicationDemo />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Varios clics con el mismo `dedupeKey` refrescan el toast vivo en vez de apilar duplicados.",
      },
    },
  },
};

// --- Update --------------------------------------------------------------

function UpdateDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className="rounded-(--radius-ui-sm) border border-ui-border px-3 py-1.5 text-sm"
      onClick={() => {
        const id = api.info({ title: "Guardando…", duration: "persistent" });
        setTimeout(() => {
          api.update(id, { title: "Guardado", tone: "success", duration: 3000 });
        }, 1200);
      }}
    >
      Guardar
    </button>
  );
}

export const Update: Story = {
  render: () => (
    <ToastProvider>
      <UpdateDemo />
    </ToastProvider>
  ),
};

// --- Positions -----------------------------------------------------------

const positions: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function PositionDemo({ position }: { position: ToastPosition }) {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => api.show({ title: position })}
    >
      {position}
    </button>
  );
}

export const Positions: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-3">
      {positions.map((position) => (
        // Cada posición necesita su propio provider: `position` se fija por
        // instancia, no por toast individual.
        <ToastProvider key={position} position={position}>
          <PositionDemo position={position} />
        </ToastProvider>
      ))}
    </div>
  ),
};

// --- CustomClasses ---------------------------------------------------------

function CustomClassesDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() =>
        api.success({
          title: "Guardado",
          message: "Con clases personalizadas por slot.",
        })
      }
    >
      Mostrar con clases propias
    </button>
  );
}

export const CustomClasses: Story = {
  render: () => (
    <ToastProvider
      classNames={{
        root: "border-fuchsia-800 bg-fuchsia-950 text-fuchsia-50",
        title: "text-fuchsia-50",
        message: "text-fuchsia-200",
      }}
    >
      <CustomClassesDemo />
    </ToastProvider>
  ),
};

// --- Unstyled ------------------------------------------------------------

function UnstyledDemo() {
  const api = useToast();
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() =>
        api.show({
          title: "Sin estilos por defecto",
          message:
            "unstyled deja el marcado desnudo para que el consumidor lo vista entero.",
        })
      }
    >
      Mostrar sin estilos
    </button>
  );
}

export const Unstyled: Story = {
  render: () => (
    <ToastProvider
      unstyled
      classNames={{
        root: "flex items-start gap-2 border border-dashed border-ui-border bg-ui-background p-2 text-xs",
      }}
    >
      <UnstyledDemo />
    </ToastProvider>
  ),
};

// --- Keyboard --------------------------------------------------------------

export const Keyboard: Story = {
  render: () => (
    <ToastProvider>
      <WithActionDemo />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Tab entra en el toast (acción y luego cierre); Escape lo descarta sin mover el foco del disparador.",
      },
    },
  },
};

// --- Mobile --------------------------------------------------------------

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => (
    <ToastProvider position="bottom-center">
      <div className="w-full max-w-[360px]">
        <TonesDemo />
      </div>
    </ToastProvider>
  ),
};
