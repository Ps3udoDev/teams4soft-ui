import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  getWeekdayLabels,
  getMonthYearLabel,
  addMonths,
} from "./calendar";

describe("buildMonthGrid", () => {
  it("devuelve 42 celdas con el mes actual marcado", () => {
    const grid = buildMonthGrid(2026, 7, 1); // julio 2026, semana inicia lunes
    expect(grid).toHaveLength(42);
    const inMonth = grid.filter((d) => d.inCurrentMonth);
    expect(inMonth).toHaveLength(31); // julio tiene 31 días
    expect(inMonth[0]!.iso).toBe("2026-07-01");
    expect(inMonth[30]!.iso).toBe("2026-07-31");
  });
  it("respeta firstDayOfWeek (domingo=0 vs lunes=1)", () => {
    const sun = buildMonthGrid(2026, 7, 0);
    const mon = buildMonthGrid(2026, 7, 1);
    expect(sun[0]!.iso).not.toBe(mon[0]!.iso);
  });
  it("genera celdas contiguas sin huecos ni repeticiones", () => {
    const grid = buildMonthGrid(2026, 2, 1); // febrero 2026 (28 días)
    const isos = grid.map((d) => d.iso);
    expect(new Set(isos).size).toBe(42);
    expect(grid.filter((d) => d.inCurrentMonth)).toHaveLength(28);
  });
  it("cruza el cambio de año en el relleno", () => {
    const grid = buildMonthGrid(2026, 1, 1); // enero 2026
    expect(grid[0]!.year).toBe(2025);
    expect(grid[0]!.inCurrentMonth).toBe(false);
  });
  it("expone día/mes/año coherentes con el iso", () => {
    const grid = buildMonthGrid(2026, 7, 1);
    const first = grid.find((d) => d.iso === "2026-07-01")!;
    expect(first.day).toBe(1);
    expect(first.month).toBe(7);
    expect(first.year).toBe(2026);
    expect(first.inCurrentMonth).toBe(true);
  });
});

describe("addMonths", () => {
  it("cruza límites de año", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("soporta saltos de 12 meses (año)", () => {
    expect(addMonths(2026, 7, 12)).toEqual({ year: 2027, month: 7 });
    expect(addMonths(2026, 7, -12)).toEqual({ year: 2025, month: 7 });
  });
});

describe("getWeekdayLabels", () => {
  it("devuelve 7 etiquetas según locale y firstDayOfWeek", () => {
    expect(getWeekdayLabels("es-EC", 1)).toHaveLength(7);
  });
  it("rota las etiquetas según firstDayOfWeek", () => {
    const sun = getWeekdayLabels("es-EC", 0);
    const mon = getWeekdayLabels("es-EC", 1);
    expect(mon[0]).toBe(sun[1]);
    expect(mon[6]).toBe(sun[0]);
  });
});

describe("getMonthYearLabel", () => {
  it("incluye el año y no está vacío", () => {
    const label = getMonthYearLabel(2026, 7, "es-EC");
    expect(label).toContain("2026");
    expect(label.length).toBeGreaterThan(4);
  });
});
