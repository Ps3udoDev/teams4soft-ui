/** La huella invalida preferencias al cambiar los campos o su orden. */
export function buildPersistStorageKey(persistKey: string, fields: string[]): string {
  let hash = 5381;
  for (const character of fields.join("|")) hash = (Math.imul(hash, 33) + character.charCodeAt(0)) >>> 0;
  return `t4s-ui:data-grid:${persistKey}:${hash.toString(36)}`;
}

export function readPersistedVisibility(key: string): Record<string, boolean> | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    if (!Object.values(value).every((entry) => typeof entry === "boolean")) return null;
    return value as Record<string, boolean>;
  } catch {
    return null;
  }
}

export function writePersistedVisibility(key: string, visibility: Record<string, boolean>): void {
  try {
    localStorage.setItem(key, JSON.stringify(visibility));
  } catch {
    // Navegación privada o cuota agotada: la preferencia queda en memoria.
  }
}
