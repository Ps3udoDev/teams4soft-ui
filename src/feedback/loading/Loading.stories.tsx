import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../primitives/button/Button";
import { LoadingOverlay } from "../loading-overlay/LoadingOverlay";
import { LoadingProvider } from "./LoadingProvider";
import { loading } from "./loading-global";

const meta: Meta<typeof LoadingProvider> = {
  title: "Feedback/Loading",
  component: LoadingProvider,
};
export default meta;
type Story = StoryObj<typeof LoadingProvider>;

function ReportIndicator() {
  return <svg aria-hidden="true" focusable="false" className="h-12 w-12 text-ui-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2h8l4 4v16H6zM14 2v5h4M9 11h6M9 15h6M9 19h6" /></svg>;
}

export const IndicadorPersonalizado: Story = {
  render: () => <div className="relative h-64 rounded-lg border border-ui-border"><LoadingOverlay open message="Generando reporte…" indicator={<ReportIndicator />} /></div>,
};

function GlobalExample() {
  React.useEffect(() => { loading.show("Consultando datos…"); return () => loading.hide(); }, []);
  return <p>La carga global cubre el viewport.</p>;
}

export const CargaGlobal: Story = {
  render: () => <LoadingProvider global><GlobalExample /></LoadingProvider>,
};

function ConcurrentExample() {
  const [remaining, setRemaining] = React.useState(2);
  React.useEffect(() => {
    const indicator = <ReportIndicator />;
    loading.show({ message: "Primera tarea", indicator });
    loading.show({ message: "Dos tareas activas", indicator });
    return () => { loading.hide(); loading.hide(); };
  }, []);
  return <div className="relative z-60 flex flex-col items-start gap-3 rounded-lg border border-ui-border bg-ui-background p-4">
    <p>{remaining} tareas pendientes. Finaliza ambas para retirar la carga.</p>
    <Button disabled={remaining === 0} onClick={() => { loading.hide(); setRemaining((count) => Math.max(0, count - 1)); }}>Finalizar una tarea</Button>
  </div>;
}

export const ProcesosConcurrentes: Story = {
  render: () => <LoadingProvider global><ConcurrentExample /></LoadingProvider>,
};
