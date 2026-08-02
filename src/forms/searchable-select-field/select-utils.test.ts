import { describe, it, expect } from "vitest";
import { normalizeText, defaultFilter, resolveText } from "./select-utils";

describe("normalizeText", () => {
  it("ignora mayúsculas y diacríticos", () => {
    expect(normalizeText("Perú")).toBe(normalizeText("peru"));
    expect(normalizeText("  Dólar  USA ")).toBe("dolar usa");
  });
  it("colapsa espacios internos y recorta los extremos", () => {
    expect(normalizeText("\tEstados   Unidos\n")).toBe("estados unidos");
    expect(normalizeText("")).toBe("");
  });
});

describe("defaultFilter", () => {
  it("busca subcadena en etiqueta y keywords, sin diacríticos", () => {
    expect(defaultFilter("Estados Unidos", ["USA"], "usa")).toBe(true);
    expect(defaultFilter("México", [], "mexico")).toBe(true);
    expect(defaultFilter("Perú", [], "chile")).toBe(false);
  });
  it("una consulta vacía deja pasar todo", () => {
    expect(defaultFilter("Perú", [], "   ")).toBe(true);
  });
});

describe("resolveText", () => {
  type Currency = { code: string; name: string };
  const options: Currency[] = [
    { code: "USD", name: "Dólar" },
    { code: "PEN", name: "Sol" },
  ];
  const cfg = {
    getLabel: (o: Currency) => o.name,
    getValueString: (o: Currency) => o.code,
  };

  it("resuelve por etiqueta exacta, valor exacto y prefijo en orden", () => {
    expect(
      resolveText("Dólar", options, { ...cfg, strategies: ["label-exact"] })
        ?.code,
    ).toBe("USD");
    expect(
      resolveText("PEN", options, { ...cfg, strategies: ["value-exact"] })?.code,
    ).toBe("PEN");
    expect(
      resolveText("So", options, { ...cfg, strategies: ["label-prefix"] })?.code,
    ).toBe("PEN");
  });

  it("ignora diacríticos y mayúsculas al resolver", () => {
    expect(
      resolveText("  dolar ", options, { ...cfg, strategies: ["label-exact"] })
        ?.code,
    ).toBe("USD");
  });

  it("devuelve null si no hay coincidencia inequívoca", () => {
    expect(
      resolveText("xyz", options, {
        ...cfg,
        strategies: ["label-exact", "label-prefix"],
      }),
    ).toBeNull();
  });

  it("salta a la siguiente estrategia cuando el prefijo es ambiguo", () => {
    const ambiguous: Currency[] = [
      { code: "SOL", name: "Sol" },
      { code: "SOB", name: "Solar" },
    ];
    // "Sol" es prefijo de ambas, pero coincide exactamente con una etiqueta.
    expect(
      resolveText("Sol", ambiguous, {
        ...cfg,
        strategies: ["label-prefix", "label-exact"],
      })?.code,
    ).toBe("SOL");
    // Sin la estrategia exacta, el prefijo ambiguo no resuelve nada.
    expect(
      resolveText("So", ambiguous, { ...cfg, strategies: ["label-prefix"] }),
    ).toBeNull();
  });

  it("un texto vacío nunca resuelve", () => {
    expect(
      resolveText("   ", options, { ...cfg, strategies: ["label-exact"] }),
    ).toBeNull();
  });

  it("no muta el arreglo de opciones", () => {
    const source: Currency[] = [...options];
    const snapshot = JSON.stringify(source);
    resolveText("Dólar", source, {
      ...cfg,
      strategies: ["label-exact", "value-exact", "label-prefix"],
    });
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});
