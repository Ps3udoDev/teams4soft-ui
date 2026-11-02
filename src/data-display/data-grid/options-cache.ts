export type OptionsCache = {
  /** Una carga por (campo, consulta recortada); los rechazos no se cachean. */
  load<O>(
    field: string,
    query: string,
    loader: (q: string) => Promise<O[]>,
  ): Promise<O[]>;
  clear(field?: string): void;
};

export function createOptionsCache(): OptionsCache {
  const entries = new Map<string, Map<string, Promise<unknown[]>>>();

  return {
    load<O>(field: string, query: string, loader: (q: string) => Promise<O[]>) {
      const q = query.trim();
      let byQuery = entries.get(field);
      const hit = byQuery?.get(q);
      if (hit) return hit as Promise<O[]>;

      // Un throw síncrono se trata como rechazo para no dejar la caché envenenada.
      let promise: Promise<O[]>;
      try {
        promise = Promise.resolve(loader(q));
      } catch (err) {
        promise = Promise.reject(err);
      }
      if (!byQuery) {
        byQuery = new Map();
        entries.set(field, byQuery);
      }
      const bucket = byQuery;
      bucket.set(q, promise);
      // Solo se evicta si la entrada sigue siendo esta (puede haber un clear() + recarga).
      promise.catch(() => {
        if (bucket.get(q) === promise) bucket.delete(q);
      });
      return promise;
    },
    clear(field) {
      if (field === undefined) entries.clear();
      else entries.delete(field);
    },
  };
}
