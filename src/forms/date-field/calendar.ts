/**
 * Modelo puro del calendario mensual de `DateField`.
 *
 * Igual que `date-utils`, opera SIEMPRE por partes locales: nunca construye una
 * fecha desde una cadena ISO ni compone el ISO desde `toISOString()` (ambos
 * introducen desplazamientos de zona horaria).
 */

import { toIso } from "./date-utils";

/** Una celda de la cuadrícula mensual (incluye el relleno de meses vecinos). */
export interface CalendarDay {
  /** Fecha de la celda en formato `YYYY-MM-DD`. */
  iso: string;
  day: number;
  /** Mes 1-12 (no el índice 0-11 de `Date`). */
  month: number;
  year: number;
  /** `false` para las celdas de relleno del mes anterior/siguiente. */
  inCurrentMonth: boolean;
}

/** Celdas de la cuadrícula: 6 semanas fijas, para que el alto no salte al navegar. */
const GRID_CELLS = 42;

const DAYS_IN_WEEK = 7;

/**
 * Cuadrícula de 42 celdas del mes (`month` 1-12), empezando en `firstDayOfWeek`
 * (0 = domingo … 6 = sábado) y rellenando con los días vecinos necesarios.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: number,
): CalendarDay[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  firstOfMonth.setFullYear(year, month - 1, 1);

  // Cuántos días hay que retroceder desde el día 1 para llegar al inicio de su
  // semana. El módulo doble evita negativos cuando `firstDayOfWeek > getDay()`.
  const offset =
    (firstOfMonth.getDay() - firstDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK;

  const days: CalendarDay[] = [];
  for (let index = 0; index < GRID_CELLS; index += 1) {
    const cursor = new Date(year, month - 1, 1 - offset + index);
    cursor.setFullYear(year, month - 1, 1 - offset + index);
    const cellYear = cursor.getFullYear();
    const cellMonth = cursor.getMonth() + 1;
    const cellDay = cursor.getDate();
    days.push({
      iso: toIso(cellYear, cellMonth, cellDay),
      day: cellDay,
      month: cellMonth,
      year: cellYear,
      inCurrentMonth: cellYear === year && cellMonth === month,
    });
  }
  return days;
}

/** Encabezado del calendario localizado (p. ej. "julio de 2026"). */
export function getMonthYearLabel(
  year: number,
  month: number,
  locale: string,
): string {
  const date = new Date(year, month - 1, 1);
  date.setFullYear(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Las 7 etiquetas cortas de día de semana, rotadas para empezar en
 * `firstDayOfWeek`. Se derivan de `Intl`, nunca de una lista fija en español.
 */
export function getWeekdayLabels(
  locale: string,
  firstDayOfWeek: number,
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const labels: string[] = [];
  // 2021-08-01 fue domingo: sirve de ancla para recorrer una semana completa.
  const anchor = new Date(2021, 7, 1);
  anchor.setFullYear(2021, 7, 1);
  for (let index = 0; index < DAYS_IN_WEEK; index += 1) {
    const weekday = (firstDayOfWeek + index) % DAYS_IN_WEEK;
    const date = new Date(2021, 7, 1 + weekday);
    date.setFullYear(2021, 7, 1 + weekday);
    labels.push(formatter.format(date));
  }
  return labels;
}

/** Desplaza `delta` meses conservando la aritmética de años (`month` 1-12). */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1,
  };
}
