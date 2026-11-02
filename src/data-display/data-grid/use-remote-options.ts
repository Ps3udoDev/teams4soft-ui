import * as React from "react";
import type { DataGridColumn } from "./DataGrid.types";
import { dataGridMessagesEs } from "./messages";
import { createOptionsCache } from "./options-cache";

export const optionValueOf = (option: unknown) => (option as { value: unknown }).value;
export const optionLabelOf = (option: unknown) => String((option as { label: unknown }).label ?? "");

const EMPTY: never[] = [];
const DEBOUNCE_MS = 250;

type Loader = (query: string) => Promise<unknown[]>;
type ValueOf = (option: any) => unknown;

// Columnas resueltas cuyo catálogo "" aún no llega: la celda de lectura las marca con data-pending.
const pendingColumns = new WeakSet<object>();
export const isOptionsPending = (column: object) => pendingColumns.has(column);

/** Estado remoto de una instancia del grid: caché de consultas, catálogos resueltos y opciones elegidas. */
export function createRemoteOptions() {
  const cache = createOptionsCache();
  const loaders = new Map<string, Loader>();
  const results = new Map<string, Map<string, unknown[]>>();
  const picked = new Map<string, unknown[]>();
  const failed = new Set<string>();
  const requested = new Set<string>();
  const listeners = new Set<() => void>();
  const resolved = new WeakMap<object, { base: unknown; extras: unknown; pending: boolean; column: object }>();
  let version = 0;

  const bump = () => {
    version += 1;
    listeners.forEach(listener => listener());
  };

  function record(field: string, query: string, options: unknown[]) {
    let byQuery = results.get(field);
    if (!byQuery) results.set(field, byQuery = new Map());
    if (byQuery.get(query) === options) return;
    byQuery.set(query, options);
    if (query === "") {
      failed.delete(field);
      bump();
    }
  }

  function load(field: string, query: string): Promise<unknown[]> {
    const q = query.trim();
    // Siempre la última función: cambiar su identidad no invalida la caché.
    const promise = cache.load<unknown>(field, q, run => {
      const loader = loaders.get(field);
      return loader ? loader(run) : Promise.reject(new Error(`DataGrid: la columna "${field}" no tiene loadOptions.`));
    });
    promise.then(options => record(field, q, options), () => {
      if (q === "" && !results.get(field)?.has("") && !failed.has(field)) {
        failed.add(field);
        bump();
      }
    });
    return promise;
  }

  function knownOptions(field: string): unknown[] {
    return [...(results.get(field)?.values() ?? [])].flat().concat(picked.get(field) ?? []);
  }

  function findOption(field: string, value: unknown, getValue: ValueOf): unknown {
    return knownOptions(field).find(option => getValue(option) === value);
  }

  return {
    register(field: string, loader: Loader) { loaders.set(field, loader); },
    load,
    peek: (field: string, query: string) => results.get(field)?.get(query.trim()),
    knownOptions,
    findOption,
    /** Recuerda una opción elegida que el catálogo "" no trae, para no perder su etiqueta. */
    remember(field: string, option: unknown, getValue: ValueOf) {
      if (findOption(field, getValue(option), getValue) !== undefined) return;
      picked.set(field, [...(picked.get(field) ?? []), option]);
      bump();
    },
    ensureCatalog(field: string) {
      if (requested.has(field)) return;
      requested.add(field);
      void load(field, "");
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getVersion: () => version,
    /** Devuelve la columna con `options` del catálogo; conserva su identidad mientras nada cambie. */
    resolve<T>(column: DataGridColumn<T>): DataGridColumn<T> {
      if (!column.loadOptions || column.type !== "select") return column;
      const staticOptions = column.options !== undefined;
      const base = staticOptions ? column.options : results.get(column.field)?.get("");
      const extras = picked.get(column.field);
      if (staticOptions && !extras) return column;
      const pending = !staticOptions && base === undefined && !failed.has(column.field);
      const cached = resolved.get(column);
      if (cached && cached.base === base && cached.extras === extras && cached.pending === pending) return cached.column as DataGridColumn<T>;
      const options = base || extras ? [...(base ?? []), ...(extras ?? [])] : undefined;
      const next: DataGridColumn<T> = { ...column, options };
      if (pending) pendingColumns.add(next);
      resolved.set(column, { base, extras, pending, column: next });
      return next;
    },
  };
}

export type RemoteOptionsStore = ReturnType<typeof createRemoteOptions>;

interface RemoteOptionsContextValue { store: RemoteOptionsStore; loadOptionsError: string }
const RemoteOptionsContext = React.createContext<RemoteOptionsContextValue | null>(null);
export const RemoteOptionsProvider = RemoteOptionsContext.Provider;

function useRemoteContext() {
  const context = React.useContext(RemoteOptionsContext);
  const local = React.useRef<RemoteOptionsStore | null>(null);
  // Fuera de un DataGrid (un FilterMenu suelto) cada uso tiene su propia caché.
  const store = context?.store ?? (local.current ??= createRemoteOptions());
  return { store, loadOptionsError: context?.loadOptionsError ?? dataGridMessagesEs.loadOptionsError };
}

/** Grid: una caché por instancia y las columnas con `options` resueltas desde el catálogo "". */
export function useRemoteOptions<T>(columns: DataGridColumn<T>[]) {
  const ref = React.useRef<RemoteOptionsStore | null>(null);
  const store = (ref.current ??= createRemoteOptions());
  for (const column of columns) if (column.loadOptions) store.register(column.field, column.loadOptions);
  const version = React.useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
  const resolvedColumns = React.useMemo(
    () => columns.some(column => column.loadOptions) ? columns.map(column => store.resolve(column)) : columns,
    // La versión cambia solo cuando un catálogo llega o falla, o se recuerda una opción elegida.
    [columns, store, version],
  );
  return { store, columns: resolvedColumns };
}

/** Solo las columnas remotas visibles cargan "" (una oculta lo hace al mostrarse). */
export function useCatalogLoading<T>(store: RemoteOptionsStore, columns: DataGridColumn<T>[], visibility: Record<string, boolean>) {
  React.useEffect(() => {
    for (const column of columns) {
      if (column.loadOptions && column.type === "select" && column.options === undefined && visibility[column.field] !== false) store.ensureCatalog(column.field);
    }
  }, [store, columns, visibility]);
}

export interface ColumnOptions<O> { options: O[]; loading: boolean; error: boolean; retry: () => void }

type Settled<O> = { field: string; query: string; attempt: number; options?: O[] };

/** Opciones de una consulta: la caché de la instancia las comparte entre celdas, editores y filtros. */
export function useColumnOptions<T, O>(column: DataGridColumn<T, O>, query: string, enabled = true): ColumnOptions<O> {
  const { store } = useRemoteContext();
  const loader = column.loadOptions;
  const field = column.field;
  const active = loader !== undefined && enabled;
  const q = query.trim();
  if (loader) store.register(field, loader as Loader);
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled<O> | null>(null);
  const retry = React.useCallback(() => setAttempt(current => current + 1), []);

  React.useEffect(() => {
    if (!active) return;
    // Cada efecto descarta lo suyo al limpiarse: una respuesta vieja o posterior al desmontaje no escribe estado.
    let live = true;
    store.load(field, q).then(
      options => { if (live) setSettled({ field, query: q, attempt, options: options as O[] }); },
      () => { if (live) setSettled({ field, query: q, attempt }); },
    );
    return () => { live = false; };
  }, [store, field, q, attempt, active]);

  if (!active) return { options: (column.options ?? EMPTY) as O[], loading: false, error: false, retry };
  const mine = settled && settled.field === field && settled.query === q && settled.attempt === attempt ? settled : null;
  const options = (store.peek(field, q) as O[] | undefined) ?? mine?.options;
  const error = options === undefined && mine !== null;
  return { options: options ?? EMPTY, loading: options === undefined && !error, error, retry };
}

/** Lo que un `SearchableSelectField` de una columna remota necesita: opciones, estado y manejadores. */
export function useRemoteSelect<T, O>(column: DataGridColumn<T, O>, value: unknown, forceEnabled = false) {
  const { store, loadOptionsError } = useRemoteContext();
  const remote = column.loadOptions !== undefined;
  const field = column.field;
  const [query, setQuery] = React.useState("");
  const [opened, setOpened] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  // Con options estáticas junto a loadOptions nada se carga hasta que se abre el selector.
  const { options: found, loading, error, retry } = useColumnOptions(column, query, column.options === undefined || opened || forceEnabled);

  const baseValue = (column.getOptionValue ?? optionValueOf) as ValueOf;
  const baseLabel = (column.getOptionLabel ?? optionLabelOf) as (option: any) => string;
  // Un marcador estable para el valor actual mientras su etiqueta no se conoce.
  const placeholder = React.useRef({} as O).current;
  const known = remote && value != null
    ? (store.findOption(field, value, baseValue) ?? column.options?.find(option => baseValue(option) === value)) as O | undefined
    : undefined;
  const extra = remote && value != null && !found.some(option => baseValue(option) === value) ? known ?? placeholder : undefined;
  const options = React.useMemo(() => extra === undefined ? found : [...found, extra], [found, extra]);

  const getOptionValue = (option: O) => option === placeholder ? value : baseValue(option);
  const getOptionLabel = (option: O) => option === placeholder ? String(value) : baseLabel(option);
  // El servidor ya filtró: el filtro local descartaría coincidencias. Solo se oculta la opción añadida del valor actual.
  const filterOption = (option: O) => option !== extra;

  const onInputValueChange = (text: string) => {
    if (!remote) return;
    // Escribir la etiqueta de una opción conocida (elegir, restaurar, sincronizar) no es una búsqueda.
    if (text !== "" && (store.knownOptions(field).some(option => baseLabel(option) === text) || (extra === placeholder && text === String(value)))) return;
    clearTimeout(timer.current);
    if (text.trim() === "") setQuery("");
    else timer.current = setTimeout(() => setQuery(text), DEBOUNCE_MS);
  };
  const onOpenChange = (open: boolean) => {
    if (!remote) return;
    if (open) {
      setOpened(true);
      if (error) retry();
      return;
    }
    clearTimeout(timer.current);
    setQuery("");
  };
  const onPick = (option: O | null) => {
    if (remote && option !== null && option !== placeholder) store.remember(field, option, baseValue);
  };

  return { remote, options, loading, error, loadOptionsError, getOptionValue, getOptionLabel, filterOption, onInputValueChange, onOpenChange, onPick };
}
