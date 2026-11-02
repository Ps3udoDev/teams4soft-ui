import { describe, expect, it } from "vitest";
import { formatNumber, formatWhileTyping, parseNumber, sanitizePaste } from "./number-utils";

describe("parseNumber", () => {
  it("parsea miles y decimales", () => {
    expect(parseNumber("1,250.50")).toEqual({ ok: true, value: 1250.5 });
  });
  it("limpia símbolo de moneda y espacios", () => {
    expect(parseNumber("$ 1,234.56 ")).toEqual({ ok: true, value: 1234.56 });
  });
  it("limpia el signo de porcentaje", () => {
    expect(parseNumber("15 %")).toEqual({ ok: true, value: 15 });
  });
  it("vacío es null", () => {
    expect(parseNumber("")).toEqual({ ok: true, value: null });
  });
  it("texto no numérico es inválido", () => {
    expect(parseNumber("abc")).toEqual({ ok: false });
    expect(parseNumber("1.2.3")).toEqual({ ok: false });
  });
  it("ignora el negativo sin allowNegative", () => {
    expect(parseNumber("-3.5")).toEqual({ ok: true, value: 3.5 });
  });
  it("acepta el negativo con allowNegative", () => {
    expect(parseNumber("-3.5", { allowNegative: true })).toEqual({ ok: true, value: -3.5 });
  });
});

describe("sanitizePaste", () => {
  it("quita espacios, símbolo, % y miles", () => {
    expect(sanitizePaste(" $ 1,234.56 %")).toBe("1234.56");
  });
  it("en integer descarta el punto y lo que sigue", () => {
    expect(sanitizePaste("1,234.56", { mode: "integer" })).toBe("1234");
  });
});

describe("formatNumber", () => {
  it("currency con prefijo", () => {
    expect(formatNumber(1250.5, { mode: "currency" })).toBe("$1,250.50");
  });
  it("percent con sufijo sin multiplicar", () => {
    expect(formatNumber(15, { mode: "percent" })).toBe("15.00 %");
  });
  it("respeta fracciones configuradas", () => {
    expect(formatNumber(18.6673, { minFractionDigits: 4, maxFractionDigits: 4 })).toBe("18.6673");
  });
  it("null es vacío", () => {
    expect(formatNumber(null)).toBe("");
  });
  it("conserva negativos de formatCellText", () => {
    expect(formatNumber(-15, { mode: "currency" })).toBe("-$15.00");
    expect(formatNumber(-15, { mode: "percent" })).toBe("-15.00 %");
  });
  it("integer no lleva decimales", () => {
    expect(formatNumber(1234, { mode: "integer" })).toBe("1,234");
  });
});

describe("formatWhileTyping", () => {
  it("agrega miles", () => {
    expect(formatWhileTyping("1250", 4)).toEqual({ text: "1,250", caret: 5 });
  });
  it("conserva decimales escritos", () => {
    expect(formatWhileTyping("1250.5", 6)).toEqual({ text: "1,250.5", caret: 7 });
    expect(formatWhileTyping("1250.50", 7)).toEqual({ text: "1,250.50", caret: 8 });
  });
  it("conserva el punto final", () => {
    expect(formatWhileTyping("12.", 3)).toEqual({ text: "12.", caret: 3 });
  });
  it("no salta al final al borrar la coma", () => {
    expect(formatWhileTyping("1250", 1)).toEqual({ text: "1,250", caret: 1 });
  });
  it("limita decimales a maxFractionDigits", () => {
    expect(formatWhileTyping("1.239", 5, { maxFractionDigits: 2 })).toEqual({ text: "1.23", caret: 4 });
  });
  it("ignora el guion sin allowNegative", () => {
    expect(formatWhileTyping("-12", 3)).toEqual({ text: "12", caret: 2 });
  });
});
