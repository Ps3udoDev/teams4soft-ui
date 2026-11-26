import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePickerField } from "./FilePickerField";

function makeFile(name: string, sizeBytes: number, type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("FilePickerField", () => {
  it("selecciona archivo, conserva el valor al cancelar, permite re-elegir el mismo y limpiar", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <FilePickerField
        label="Archivo de cobranza"
        accept=".xlsx,.csv"
        onValueChange={onValueChange}
      />,
    );

    const fileInput = screen.getByLabelText("Archivo de cobranza") as HTMLInputElement;
    const f1 = makeFile("cuotas.xlsx", 1024);
    await user.upload(fileInput, f1);
    expect(onValueChange).toHaveBeenLastCalledWith(f1);
    expect(screen.getByText("cuotas.xlsx")).toBeInTheDocument();

    // Cancelar (change vacío sin archivos) conserva el archivo confirmado
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(screen.getByText("cuotas.xlsx")).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledTimes(1);

    // Re-elegir el mismo archivo vuelve a emitir onValueChange
    const f1Again = makeFile("cuotas.xlsx", 1024);
    await user.upload(fileInput, f1Again);
    expect(onValueChange).toHaveBeenCalledTimes(2);

    // Limpiar deja null y oculta el nombre
    await user.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText("cuotas.xlsx")).toBeNull();
  });

  it("rechaza extensión o tamaño inválido anunciando el error y conservando el valor confirmado", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onReject = vi.fn();
    render(
      <FilePickerField
        label="Soporte"
        accept=".pdf,.xlsx"
        maxSizeBytes={2048}
        onValueChange={onValueChange}
        onReject={onReject}
      />,
    );

    const fileInput = screen.getByLabelText("Soporte") as HTMLInputElement;
    const valid = makeFile("recibo.pdf", 512, "application/pdf");
    await user.upload(fileInput, valid);
    expect(onValueChange).toHaveBeenCalledWith(valid);

    // Extensión rechazada (usamos fireEvent para evitar filtro de userEvent.upload)
    const badExt = makeFile("script.exe", 200, "application/octet-stream");
    fireEvent.change(fileInput, { target: { files: [badExt] } });
    expect(onReject).toHaveBeenLastCalledWith("type", badExt);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("recibo.pdf")).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledTimes(1);

    // Tamaño rechazado
    const tooBig = makeFile("grande.pdf", 4096, "application/pdf");
    fireEvent.change(fileInput, { target: { files: [tooBig] } });
    expect(onReject).toHaveBeenLastCalledWith("size", tooBig);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("recibo.pdf")).toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});
