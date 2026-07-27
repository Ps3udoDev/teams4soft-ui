import type { Ref, RefCallback, MutableRefObject } from "react";

/**
 * Combina varias refs (callback u objeto) en una sola ref de callback,
 * para reenviar el nodo a todas ellas.
 */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref != null) {
        (ref as MutableRefObject<T | null>).current = node;
      }
    }
  };
}
