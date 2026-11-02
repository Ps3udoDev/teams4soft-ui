export type NumberFieldMode = "decimal" | "currency" | "percent" | "integer";

export type NumberFormatOptions = {
  mode?: NumberFieldMode;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  currencySymbol?: string;
  allowNegative?: boolean;
  locale?: string;
};

export type ParseNumberResult = { ok: true; value: number | null } | { ok: false };

const DEFAULT_LOCALE = "es-MX";

function resolveDigits(opts: NumberFormatOptions): { min: number; max: number } {
  if (opts.mode === "integer") return { min: 0, max: 0 };
  let min = opts.minFractionDigits ?? opts.maxFractionDigits ?? 2;
  const max = opts.maxFractionDigits ?? opts.minFractionDigits ?? 2;
  if (min > max) min = max;
  return { min, max };
}

function resolveSeparators(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

/** Limpia texto pegado: espacios, símbolo de moneda, `%` y separadores de miles. */
export function sanitizePaste(text: string, opts: NumberFormatOptions = {}): string {
  const { group, decimal } = resolveSeparators(opts.locale ?? DEFAULT_LOCALE);
  let result = text.replace(/\s/g, "");
  const symbol = opts.currencySymbol ?? "$";
  if (symbol) result = result.split(symbol).join("");
  result = result.split("%").join("");
  if (group) result = result.split(group).join("");
  if (!opts.allowNegative) result = result.split("-").join("");
  if (opts.mode === "integer") {
    const index = result.indexOf(decimal);
    if (index >= 0) result = result.slice(0, index);
  }
  return result;
}

export function parseNumber(text: string, opts: NumberFormatOptions = {}): ParseNumberResult {
  const { decimal } = resolveSeparators(opts.locale ?? DEFAULT_LOCALE);
  const normalized = sanitizePaste(text, opts).split(decimal).join(".");
  if (normalized === "") return { ok: true, value: null };
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return { ok: false };
  const value = Number(normalized);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

export function formatNumber(value: number | null, opts: NumberFormatOptions = {}): string {
  if (value === null || !Number.isFinite(value)) return "";
  const { min, max } = resolveDigits(opts);
  const text = new Intl.NumberFormat(opts.locale ?? DEFAULT_LOCALE, {
    style: "decimal", minimumFractionDigits: min, maximumFractionDigits: max,
  }).format(value);
  if (opts.mode === "currency") {
    const symbol = opts.currencySymbol ?? "$";
    return text.startsWith("-") ? `-${symbol}${text.slice(1)}` : `${symbol}${text}`;
  }
  if (opts.mode === "percent") return `${text} %`;
  return text;
}

/** Reaplica miles mientras se escribe y recalcula el caret contando caracteres significativos a su izquierda. */
export function formatWhileTyping(
  text: string,
  caret: number,
  opts: NumberFormatOptions = {},
): { text: string; caret: number } {
  const { group, decimal } = resolveSeparators(opts.locale ?? DEFAULT_LOCALE);
  const { max } = resolveDigits(opts);

  let negative = false;
  let intPart = "";
  let fracPart = "";
  let hasDecimal = false;
  let keptBeforeCaret = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i);
    let kept = false;
    if (char >= "0" && char <= "9") {
      if (!hasDecimal) { intPart += char; kept = true; }
      else if (fracPart.length < max) { fracPart += char; kept = true; }
    } else if (char === decimal) {
      if (max > 0 && !hasDecimal) { hasDecimal = true; kept = true; }
    } else if (char === "-") {
      if (opts.allowNegative && !negative && intPart === "" && !hasDecimal) { negative = true; kept = true; }
    }
    if (kept && i < caret) keptBeforeCaret += 1;
  }

  const groupedInt = group ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, group) : intPart;
  const output = `${negative ? "-" : ""}${groupedInt}${hasDecimal ? decimal : ""}${fracPart}`;

  let position = 0;
  let seen = 0;
  while (position < output.length && seen < keptBeforeCaret) {
    if (output.charAt(position) !== group) seen += 1;
    position += 1;
  }
  return { text: output, caret: position };
}
