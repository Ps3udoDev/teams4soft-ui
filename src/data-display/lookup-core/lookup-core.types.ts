import type { ReactNode } from "react";

export type LookupQuery = string | Record<string, string>;

export type LookupSearchContext = {
  /** 1-based. */
  page: number;
  pageSize: number;
  criterion?: string;
  signal: AbortSignal;
};

export type LookupSearchResponse<T> =
  | T[]
  | { items: T[]; total: number; emptyReason?: string; emptyMessage?: ReactNode }
  | null;

export type EntityLookupMessages = {
  trigger: string;
  criteria: string;
  clear: string;
  dialogTitle: string;
  accept: string;
  cancel: string;
  create: string;
  view: string;
  selectedHint: string;
  notFound: (query: string) => ReactNode;
  createPrompt: (query: string) => ReactNode;
  createAccept: string;
  createReject: string;
  queryRequired: string;
};

export const entityLookupMessagesEs: EntityLookupMessages = {
  trigger: "Buscar",
  criteria: "Criterio de búsqueda",
  clear: "Limpiar",
  dialogTitle: "Seleccionar elemento",
  accept: "Aceptar",
  cancel: "Cancelar",
  create: "Nuevo",
  view: "Consultar",
  selectedHint: "Seleccionado",
  notFound: (query) => `No se encontró «${query}»`,
  createPrompt: (query) => `«${query}» no fue encontrado. ¿Desea crear uno nuevo?`,
  createAccept: "Sí, crear nuevo",
  createReject: "No",
  queryRequired: "Ingrese un término de búsqueda para continuar.",
};
