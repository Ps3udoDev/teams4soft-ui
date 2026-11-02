import type { ReactNode } from "react";
import { normalizeText } from "../data-grid/filters/filter-fns";
import type { LookupQuery, LookupSearchResponse } from "./lookup-core.types";

export { normalizeText };

export type NormalizedLookupResponse<T> =
  | { kind: "abort" }
  | { kind: "client"; items: T[] }
  | { kind: "server"; items: T[]; total: number; emptyMessage?: ReactNode };

export function normalizeResponse<T>(response: LookupSearchResponse<T>): NormalizedLookupResponse<T> {
  if (response === null) return { kind: "abort" };
  if (Array.isArray(response)) return { kind: "client", items: response };
  return { kind: "server", items: response.items, total: response.total, emptyMessage: response.emptyMessage };
}

export function isEmptyQuery(query: LookupQuery): boolean {
  if (typeof query === "string") return query.trim() === "";
  return Object.values(query).every((value) => value.trim() === "");
}

export function getByPath(item: unknown, path: string): unknown {
  let current: unknown = item;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function textOf(value: unknown): string {
  return value === null || value === undefined ? "" : normalizeText(String(value));
}

export function filterLocalItems<T>(items: readonly T[], text: string, keys: readonly string[]): T[] {
  const needle = normalizeText(text);
  return items.filter((item) => keys.some((key) => textOf(getByPath(item, key)).includes(needle)));
}

export function matchLocalItems<T>(
  items: readonly T[],
  text: string,
  keys: readonly string[],
  getItemLabel: (item: T) => string,
  matchItem?: (item: T, text: string) => boolean,
): T[] {
  if (matchItem) return items.filter((item) => matchItem(item, text));
  const needle = normalizeText(text);
  const exact = items.filter(
    (item) => textOf(getItemLabel(item)) === needle || keys.some((key) => textOf(getByPath(item, key)) === needle),
  );
  if (exact.length > 0) return exact;
  return items.filter(
    (item) => textOf(getItemLabel(item)).includes(needle) || keys.some((key) => textOf(getByPath(item, key)).includes(needle)),
  );
}
