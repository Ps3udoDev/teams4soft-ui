/**
 * Utilidades deterministas de normalización, filtrado y resolución de texto
 * para `SearchableSelectField`.
 *
 * Ninguna función muta el arreglo de opciones que recibe: el orden recibido es
 * el contrato por defecto del componente.
 */

/** Estrategias de resolución de un texto libre contra una opción. */
export type ResolutionStrategy = "label-exact" | "value-exact" | "label-prefix";

/**
 * Forma canónica para comparar: minúsculas, sin diacríticos, sin espacios
 * redundantes. Así "Perú", "peru" y " PERU " comparan igual.
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Filtro por defecto: subcadena insensible a mayúsculas y diacríticos sobre la
 * etiqueta o cualquiera de las palabras clave. Una consulta vacía no filtra.
 */
export function defaultFilter(
  label: string,
  keywords: string[],
  query: string,
): boolean {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery.length === 0) return true;
  if (normalizeText(label).includes(normalizedQuery)) return true;
  return keywords.some((keyword) =>
    normalizeText(keyword).includes(normalizedQuery),
  );
}

/**
 * Resuelve un texto confirmado a una opción aplicando las estrategias EN
 * ORDEN. Una estrategia que produce más de una coincidencia es ambigua y se
 * descarta (se pasa a la siguiente); si ninguna produce una coincidencia
 * inequívoca, devuelve `null` — nunca adivina.
 */
export function resolveText<TOption>(
  text: string,
  options: TOption[],
  cfg: {
    strategies: ResolutionStrategy[];
    getLabel: (option: TOption) => string;
    getValueString: (option: TOption) => string;
  },
): TOption | null {
  const query = normalizeText(text);
  if (query.length === 0) return null;

  for (const strategy of cfg.strategies) {
    const matches = options.filter((option) => {
      switch (strategy) {
        case "label-exact":
          return normalizeText(cfg.getLabel(option)) === query;
        case "value-exact":
          return normalizeText(cfg.getValueString(option)) === query;
        case "label-prefix":
          return normalizeText(cfg.getLabel(option)).startsWith(query);
        default:
          return false;
      }
    });
    if (matches.length === 1) return matches[0] ?? null;
  }

  return null;
}
