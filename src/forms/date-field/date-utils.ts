/**
 * Utilidades deterministas de fecha para `DateField`.
 *
 * Regla transversal: una fecha de calendario NO tiene hora ni zona horaria.
 * Por eso el valor público es la cadena ISO `YYYY-MM-DD` y toda conversión a
 * `Date` se hace SIEMPRE por partes (`new Date(year, month - 1, day)`, que es
 * medianoche local). Está prohibido `new Date("2026-07-27")`: el motor lo
 * interpreta como UTC y en zonas horarias negativas devuelve el día anterior.
 */

/** Valor público del campo: cadena ISO `YYYY-MM-DD`, o `null` si está vacío. */
export type DateFieldValue = string | null;

/** Formato visible del input (no afecta al valor público, que siempre es ISO). */
export type DisplayFormat = "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";

/** Resultado de intentar resolver el texto escrito por la persona usuaria. */
export type ParseResult =
  | { status: "valid"; value: string }
  | { status: "empty" }
  | { status: "invalid" };

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Pivote por defecto para años de dos dígitos (`00–50` → 2000s, `51–99` → 1900s). */
const DEFAULT_TWO_DIGIT_YEAR_PIVOT = 50;

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/**
 * `true` solo si `value` tiene la forma exacta `YYYY-MM-DD` Y representa un día
 * que existe en el calendario (rechaza `2026-02-31`, `2025-02-29`, `2026-13-01`).
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return isRealDate(year, month, day);
}

/**
 * Verifica que la terna exista realmente construyendo la fecha local y
 * comprobando que el motor no hizo "rollover" (31/02 → 03/03).
 */
function isRealDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  // `setFullYear` evita el mapeo de años 0-99 al siglo XX que aplica el
  // constructor de `Date`; sin él, `new Date(26, 6, 27)` sería 1926.
  date.setFullYear(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Partes numéricas de una fecha ISO válida (mes 1-12), o `null` si no lo es. */
export function parseIsoParts(
  value: string,
): { year: number; month: number; day: number } | null {
  if (!isValidIsoDate(value)) return null;
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
    day: Number(value.slice(8, 10)),
  };
}

/** Compone la cadena ISO cero-padded a partir de las partes (mes 1-12). */
export function toIso(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Orden cronológico de dos cadenas ISO. La comparación lexicográfica es
 * suficiente y exacta para `YYYY-MM-DD` cero-padded (no construye `Date`).
 */
export function compareIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** `true` si `value` está dentro de `[min, max]` (ambos inclusivos y opcionales). */
export function isWithinRange(
  value: string,
  min?: DateFieldValue,
  max?: DateFieldValue,
): boolean {
  if (min && compareIso(value, min) < 0) return false;
  if (max && compareIso(value, max) > 0) return false;
  return true;
}

/** Posición (índice de componente) de cada parte según el formato visible. */
const FORMAT_ORDER: Record<
  DisplayFormat,
  { day: number; month: number; year: number }
> = {
  "dd/MM/yyyy": { day: 0, month: 1, year: 2 },
  "MM/dd/yyyy": { month: 0, day: 1, year: 2 },
  "yyyy-MM-dd": { year: 0, month: 1, day: 2 },
};

/**
 * Expande un año escrito con dos dígitos usando el pivote: `<= pivot` cae en el
 * siglo XXI, el resto en el XX. Un año de 3+ dígitos se devuelve tal cual.
 */
function expandYear(raw: string, pivot: number): number {
  const year = Number(raw);
  if (raw.length > 2) return year;
  return year <= pivot ? 2000 + year : 1900 + year;
}

/**
 * Resuelve el texto libre del input a un valor ISO.
 *
 * Acepta `/`, `.` y `-` como separadores en cualquier formato; mapea las
 * posiciones según `displayFormat`; expande años de dos dígitos con
 * `twoDigitYearPivot`. NUNCA "corrige" una fecha imposible: devuelve
 * `{ status: "invalid" }` para que el componente conserve el texto escrito.
 */
export function parseDateInput(
  text: string,
  opts: { displayFormat: DisplayFormat; twoDigitYearPivot?: number },
): ParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { status: "empty" };

  const parts = trimmed.split(/[/.\-\s]+/).filter((part) => part.length > 0);
  if (parts.length !== 3) return { status: "invalid" };
  if (parts.some((part) => !/^\d+$/.test(part))) return { status: "invalid" };

  const order = FORMAT_ORDER[opts.displayFormat];
  const pivot = opts.twoDigitYearPivot ?? DEFAULT_TWO_DIGIT_YEAR_PIVOT;

  const rawYear = parts[order.year];
  const rawMonth = parts[order.month];
  const rawDay = parts[order.day];
  if (rawYear === undefined || rawMonth === undefined || rawDay === undefined) {
    return { status: "invalid" };
  }

  const year = expandYear(rawYear, pivot);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!isRealDate(year, month, day)) return { status: "invalid" };
  return { status: "valid", value: toIso(year, month, day) };
}

/**
 * Reordena un valor ISO al formato visible del input (numérico simple).
 * Para una etiqueta legible y localizada usa `formatDateFieldValue`.
 */
export function formatIso(
  value: DateFieldValue,
  opts: { displayFormat: DisplayFormat },
): string {
  if (!value) return "";
  const parts = parseIsoParts(value);
  if (!parts) return "";
  const { year, month, day } = parts;
  switch (opts.displayFormat) {
    case "MM/dd/yyyy":
      return `${pad(month, 2)}/${pad(day, 2)}/${pad(year, 4)}`;
    case "yyyy-MM-dd":
      return toIso(year, month, day);
    case "dd/MM/yyyy":
    default:
      return `${pad(day, 2)}/${pad(month, 2)}/${pad(year, 4)}`;
  }
}

/**
 * Adaptador `Date` → valor del campo. Lee las partes LOCALES de la fecha, así
 * que una `Date` creada a medianoche local conserva su día.
 */
export function toDateFieldValue(date: Date): DateFieldValue {
  if (Number.isNaN(date.getTime())) return null;
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Adaptador valor del campo → `Date` a MEDIANOCHE LOCAL. La aplicación decide
 * cómo serializarla para su API (si la envía en UTC, debe compensar el offset).
 */
export function fromDateFieldValue(value: DateFieldValue): Date | null {
  if (!value) return null;
  const parts = parseIsoParts(value);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setFullYear(parts.year, parts.month - 1, parts.day);
  return date;
}

/** Etiqueta legible y localizada (p. ej. "27 de julio de 2026"). */
export function formatDateFieldValue(
  value: DateFieldValue,
  locale: string,
): string {
  const date = fromDateFieldValue(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
