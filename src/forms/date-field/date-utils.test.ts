import { describe, it, expect } from "vitest";
import {
  isValidIsoDate,
  parseIsoParts,
  toIso,
  compareIso,
  isWithinRange,
  parseDateInput,
  formatIso,
  toDateFieldValue,
  fromDateFieldValue,
  formatDateFieldValue,
} from "./date-utils";

describe("isValidIsoDate", () => {
  it("acepta fechas reales YYYY-MM-DD", () => {
    expect(isValidIsoDate("2026-07-27")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true); // año bisiesto
  });
  it("rechaza fechas imposibles y formatos malos", () => {
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("27/07/2026")).toBe(false);
    expect(isValidIsoDate("2026-7-1")).toBe(false);
    expect(isValidIsoDate("2025-02-29")).toBe(false); // no bisiesto
    expect(isValidIsoDate("")).toBe(false);
  });
});

describe("parseIsoParts / toIso", () => {
  it("extrae partes con mes 1-12 y reconstruye con cero-padding", () => {
    expect(parseIsoParts("2026-07-27")).toEqual({
      year: 2026,
      month: 7,
      day: 27,
    });
    expect(parseIsoParts("no-es-fecha")).toBeNull();
    expect(toIso(2026, 7, 5)).toBe("2026-07-05");
    expect(toIso(2026, 12, 31)).toBe("2026-12-31");
  });
});

describe("parseDateInput", () => {
  it("acepta dd/MM/yyyy con separador / o .", () => {
    expect(
      parseDateInput("27/07/2026", { displayFormat: "dd/MM/yyyy" }),
    ).toEqual({ status: "valid", value: "2026-07-27" });
    expect(
      parseDateInput("27.03.2026", { displayFormat: "dd/MM/yyyy" }),
    ).toEqual({ status: "valid", value: "2026-03-27" });
  });
  it("resuelve año de dos dígitos con pivote", () => {
    // pivote 50: 00-50 -> 2000-2050 ; 51-99 -> 1951-1999
    expect(
      parseDateInput("27/07/26", {
        displayFormat: "dd/MM/yyyy",
        twoDigitYearPivot: 50,
      }),
    ).toEqual({ status: "valid", value: "2026-07-27" });
    expect(
      parseDateInput("27/07/80", {
        displayFormat: "dd/MM/yyyy",
        twoDigitYearPivot: 50,
      }),
    ).toEqual({ status: "valid", value: "1980-07-27" });
  });
  it("marca invalid una fecha imposible sin borrarla", () => {
    expect(
      parseDateInput("31/02/2026", { displayFormat: "dd/MM/yyyy" }),
    ).toEqual({ status: "invalid" });
  });
  it("texto vacío es empty", () => {
    expect(parseDateInput("   ", { displayFormat: "dd/MM/yyyy" })).toEqual({
      status: "empty",
    });
  });
  it("respeta MM/dd/yyyy", () => {
    expect(
      parseDateInput("07/27/2026", { displayFormat: "MM/dd/yyyy" }),
    ).toEqual({ status: "valid", value: "2026-07-27" });
  });
  it("respeta yyyy-MM-dd", () => {
    expect(
      parseDateInput("2026-07-27", { displayFormat: "yyyy-MM-dd" }),
    ).toEqual({ status: "valid", value: "2026-07-27" });
  });
  it("rechaza texto que no son 3 componentes numéricos", () => {
    expect(parseDateInput("27/07", { displayFormat: "dd/MM/yyyy" })).toEqual({
      status: "invalid",
    });
    expect(parseDateInput("hola", { displayFormat: "dd/MM/yyyy" })).toEqual({
      status: "invalid",
    });
  });
});

describe("range", () => {
  it("isWithinRange respeta min/max inclusivos", () => {
    expect(isWithinRange("2026-07-27", "2020-01-01", "2030-12-31")).toBe(true);
    expect(isWithinRange("2019-12-31", "2020-01-01", undefined)).toBe(false);
    expect(isWithinRange("2020-01-01", "2020-01-01", "2020-01-01")).toBe(true);
    expect(isWithinRange("2031-01-01", undefined, "2030-12-31")).toBe(false);
  });
  it("compareIso ordena lexicográficamente", () => {
    expect(compareIso("2026-01-01", "2026-01-02")).toBeLessThan(0);
    expect(compareIso("2026-01-02", "2026-01-01")).toBeGreaterThan(0);
    expect(compareIso("2026-01-01", "2026-01-01")).toBe(0);
  });
});

describe("adaptadores sin desplazamiento de zona horaria", () => {
  it("toDateFieldValue/fromDateFieldValue conservan el día en TZ local", () => {
    const iso = "2026-07-27";
    const date = fromDateFieldValue(iso)!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // julio (0-indexado)
    expect(date.getDate()).toBe(27);
    expect(toDateFieldValue(date)).toBe(iso);
  });
  it("fromDateFieldValue devuelve null para valores no válidos", () => {
    expect(fromDateFieldValue(null)).toBeNull();
    expect(fromDateFieldValue("2026-02-31")).toBeNull();
  });
});

describe("formatIso", () => {
  it("formatea al displayFormat visible", () => {
    expect(formatIso("2026-07-27", { displayFormat: "dd/MM/yyyy" })).toBe(
      "27/07/2026",
    );
    expect(formatIso("2026-07-27", { displayFormat: "MM/dd/yyyy" })).toBe(
      "07/27/2026",
    );
    expect(formatIso("2026-07-27", { displayFormat: "yyyy-MM-dd" })).toBe(
      "2026-07-27",
    );
    expect(formatIso(null, { displayFormat: "dd/MM/yyyy" })).toBe("");
  });
});

describe("formatDateFieldValue", () => {
  it("localiza con Intl sin desplazar el día", () => {
    const label = formatDateFieldValue("2026-07-27", "es-EC");
    expect(label).toContain("27");
    expect(label).toContain("2026");
    expect(formatDateFieldValue(null, "es-EC")).toBe("");
  });
});
