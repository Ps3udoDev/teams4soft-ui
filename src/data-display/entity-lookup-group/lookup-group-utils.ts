import { devWarn } from "../../lib";
import { getByPath } from "../lookup-core/lookup-utils";
import type { LookupGroupField, NormalizedField } from "./EntityLookupGroup.types";

const read = (values: Record<string, string>, key: string): string => (values[key] ?? "").trim();

export function normalizeFields<T>(fields: readonly LookupGroupField<T>[]): NormalizedField<T>[] {
  const marked = fields.flatMap((field, index) => (field.primary ? [index] : []));
  if (marked.length > 1) {
    devWarn(`EntityLookupGroup: only one field can be \`primary\`; using "${fields[marked[0] as number]?.key}".`);
  }
  const primaryIndex = marked[0] ?? fields.length - 1;
  return fields.map((field, index) => ({
    ...field,
    param: field.param ?? field.key,
    searchable: field.searchable ?? true,
    primary: index === primaryIndex,
  }));
}

export function buildDefaultParams<T>({
  fields,
  values,
  term,
  searchParam = "search",
}: {
  fields: readonly NormalizedField<T>[];
  values: Record<string, string>;
  term: string;
  searchParam?: string;
}): Record<string, string> {
  const searchable = fields.filter((field) => field.searchable);
  const params: Record<string, string> = {};
  let filled = 0;
  for (const field of searchable) {
    const value = read(values, field.key);
    params[field.param] = value;
    if (value) filled += 1;
  }
  if (searchParam) {
    const complete = searchable.length > 0 && filled === searchable.length;
    params[searchParam] = complete ? "" : term.trim();
  }
  return params;
}

export function buildDefaultSearchLabel<T>({
  fields,
  values,
}: {
  fields: readonly NormalizedField<T>[];
  values: Record<string, string>;
}): string {
  return fields
    .filter((field) => field.searchable)
    .map((field) => read(values, field.key))
    .filter(Boolean)
    .join(" ");
}

export function applySelection<T>(
  fields: readonly NormalizedField<T>[],
  values: Record<string, string>,
  item: T,
): Record<string, string> {
  const next = { ...values };
  for (const field of fields) {
    if (!field.selectField) continue;
    const paths = Array.isArray(field.selectField) ? field.selectField : [field.selectField];
    let picked = "";
    for (const path of paths) {
      const raw = getByPath(item, path);
      const text = raw === null || raw === undefined ? "" : String(raw);
      if (text !== "") {
        picked = text;
        break;
      }
    }
    // Legacy clears the field when the row has nothing for it, so a stale value never survives a new selection.
    next[field.key] = picked;
  }
  return next;
}
