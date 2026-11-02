import { devWarn } from "../../lib";

export type GridChange = {
  type: "edit" | "add" | "remove" | "reset";
  rowId: string | null;
  field: string | null;
  prev: unknown;
  next: unknown;
};

export type GridRowsDiff = {
  dirtyIds: string[];
  addedIds: string[];
  removedIds: string[];
};

export type GridRowsStore<T> = {
  getRows(): T[];
  getRow(id: string): T | undefined;
  edit(id: string, field: string, value: unknown): GridChange | null;
  patch(id: string, partial: Partial<T>): GridChange[];
  add(row: T): GridChange;
  remove(id: string): GridChange | null;
  reset(rows: T[]): GridChange;
  /** Controlled mode: adopts external rows without touching the baseline. */
  replaceCurrent(rows: T[]): void;
  getDiff(): GridRowsDiff;
  subscribe(listener: () => void): () => void;
};

type Rec = Record<string, unknown>;

function sameRow(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const ra = a as Rec;
  const rb = b as Rec;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const key of keys) {
    if (!Object.is(ra[key], rb[key])) return false;
  }
  return true;
}

export function createGridRowsStore<T>(opts: {
  getRowId: (row: T) => string;
  rows: T[];
}): GridRowsStore<T> {
  const { getRowId } = opts;
  let base = new Map<string, T>();
  let rows: T[] = [];
  let index = new Map<string, number>();
  const listeners = new Set<() => void>();

  const buildIndex = () => {
    index = new Map();
    rows.forEach((row, i) => index.set(getRowId(row), i));
  };
  const setBase = (source: T[]) => {
    base = new Map();
    for (const row of source) base.set(getRowId(row), row);
  };
  const setRows = (source: T[]) => {
    rows = [...source];
    buildIndex();
  };
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };
  const replaceRowAt = (i: number, row: T) => {
    rows = rows.slice();
    rows[i] = row;
  };

  setBase(opts.rows);
  setRows(opts.rows);

  const store: GridRowsStore<T> = {
    getRows: () => rows,
    getRow: (id) => {
      const i = index.get(id);
      return i === undefined ? undefined : rows[i];
    },
    edit(id, field, value) {
      const i = index.get(id);
      if (i === undefined) return null;
      const row = rows[i];
      const prev = (row as Rec)[field];
      if (Object.is(prev, value)) return null;
      replaceRowAt(i, { ...row, [field]: value } as T);
      notify();
      return { type: "edit", rowId: id, field, prev, next: value };
    },
    patch(id, partial) {
      const i = index.get(id);
      if (i === undefined) return [];
      const row = rows[i];
      const changes: GridChange[] = [];
      const next: Rec = { ...(row as Rec) };
      for (const [field, value] of Object.entries(partial as Rec)) {
        const prev = (row as Rec)[field];
        if (Object.is(prev, value)) continue;
        next[field] = value;
        changes.push({ type: "edit", rowId: id, field, prev, next: value });
      }
      if (changes.length === 0) return [];
      replaceRowAt(i, next as T);
      notify();
      return changes;
    },
    add(row) {
      const id = getRowId(row);
      const change: GridChange = { type: "add", rowId: id, field: null, prev: undefined, next: row };
      if (index.has(id)) {
        devWarn(`DataGrid: cannot add a row with an existing id "${id}".`);
        return change;
      }
      rows = [...rows, row];
      index.set(id, rows.length - 1);
      notify();
      return change;
    },
    remove(id) {
      const i = index.get(id);
      if (i === undefined) return null;
      const prev = rows[i];
      rows = rows.filter((_, j) => j !== i);
      buildIndex();
      notify();
      return { type: "remove", rowId: id, field: null, prev, next: undefined };
    },
    reset(next) {
      const prev = rows;
      setBase(next);
      setRows(next);
      notify();
      return { type: "reset", rowId: null, field: null, prev, next: rows };
    },
    replaceCurrent(next) {
      setRows(next);
      notify();
    },
    getDiff() {
      const dirtyIds: string[] = [];
      const addedIds: string[] = [];
      const removedIds: string[] = [];
      const present = new Set<string>();
      for (const row of rows) {
        const id = getRowId(row);
        present.add(id);
        const original = base.get(id);
        if (original === undefined) addedIds.push(id);
        else if (!sameRow(original, row)) dirtyIds.push(id);
      }
      for (const id of base.keys()) {
        if (!present.has(id)) removedIds.push(id);
      }
      return { dirtyIds, addedIds, removedIds };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return store;
}
