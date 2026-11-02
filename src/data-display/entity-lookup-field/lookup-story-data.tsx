import * as React from "react";
import type { DataGridColumn } from "../data-grid/DataGrid.types";
import type { LookupSearchContext, LookupSearchResponse } from "../lookup-core/lookup-core.types";

export type Person = { id: number; code: string; lastName: string; motherLastName: string; firstName: string; city: string };

const lastNames = ["Pérez", "García", "López", "Martínez", "Rodríguez", "Fuentes", "Hernández", "Torres", "Ramírez", "Flores"];
const motherNames = ["Soto", "Vega", "Rojas", "Medina", "Castro", "Ortega", "Silva", "Reyes", "Mora", "Cruz"];
const firstNames = ["Felipe", "Ana", "Luis", "María", "Jorge", "Sofía", "Carlos", "Laura", "Diego", "Elena", "Pablo", "Rosa"];
const cities = ["Quito", "Guayaquil", "Cuenca", "Ambato", "Loja"];

export const people: Person[] = Array.from({ length: 500 }, (_, index) => ({
  id: index + 1,
  code: `P${String(index + 1).padStart(4, "0")}`,
  lastName: lastNames[index % lastNames.length]!,
  motherLastName: motherNames[(index * 3) % motherNames.length]!,
  firstName: firstNames[(index * 7) % firstNames.length]!,
  city: cities[index % cities.length]!,
}));

export const personId = (person: Person) => person.id;
export const personLabel = (person: Person) => `${person.firstName} ${person.lastName} ${person.motherLastName}`;

export const personColumns: DataGridColumn<Person>[] = [
  { field: "code", header: "Código", minWidth: 90 },
  { field: "lastName", header: "Apellido paterno", minWidth: 140 },
  { field: "motherLastName", header: "Apellido materno", minWidth: 140 },
  { field: "firstName", header: "Nombre", minWidth: 120 },
  { field: "city", header: "Ciudad", minWidth: 110 },
];

export const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const LATENCY_MS = 300;

/** Espera la latencia del back simulado; `false` si la búsqueda se abortó mientras tanto. */
export function wait(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(!signal.aborted), LATENCY_MS));
}

export type BackCall = { query: string | Record<string, string>; page: number; pageSize: number; criterion?: string };

/** Pagina como lo haría el servidor y devuelve `{ items, total }`. */
export function paginate<T>(rows: T[], ctx: LookupSearchContext): { items: T[]; total: number } {
  const start = (ctx.page - 1) * ctx.pageSize;
  return { items: rows.slice(start, start + ctx.pageSize), total: rows.length };
}

/** Back simulado de una sola cadena: respeta `criterion`, `page` y `pageSize`. */
export function createPeopleSearch(onCall: (call: BackCall) => void, source: Person[] = people) {
  return async (query: string, ctx: LookupSearchContext): Promise<LookupSearchResponse<Person>> => {
    onCall({ query, page: ctx.page, pageSize: ctx.pageSize, criterion: ctx.criterion });
    if (!(await wait(ctx.signal))) return null;
    const needle = plain(query);
    if (needle === "bloqueado") {
      return { items: [], total: 0, emptyReason: "blocked", emptyMessage: "El proveedor existe pero está bloqueado y no puede seleccionarse." };
    }
    let rows = source;
    if (needle) {
      if (ctx.criterion === "code") rows = source.filter((person) => plain(person.code).startsWith(needle));
      else if (ctx.criterion === "lastName") rows = source.filter((person) => plain(person.lastName).startsWith(needle));
      else rows = source.filter((person) => plain(`${person.code} ${personLabel(person)}`).includes(needle));
    }
    return paginate(rows, ctx);
  };
}

export function useBackLog() {
  const [calls, setCalls] = React.useState<BackCall[]>([]);
  const log = React.useCallback((call: BackCall) => setCalls((current) => [...current, call]), []);
  return { calls, log };
}

export function BackLog({ calls, label = "Consultas al back" }: { calls: BackCall[]; label?: string }) {
  const last = calls.at(-1);
  return <output aria-label={label} className="block rounded border border-ui-border p-3 text-xs">
    <span data-testid="back-count">{label}: {calls.length}</span>
    <br />
    <span data-testid="back-last">Última: {last ? JSON.stringify(last) : "ninguna"}</span>
  </output>;
}

export function Selected({ item }: { item: Person | null }) {
  return <output aria-label="Selección" data-testid="selected" className="block text-xs">
    Seleccionado: {item ? `${item.code} · ${personLabel(item)}` : "ninguno"}
  </output>;
}
