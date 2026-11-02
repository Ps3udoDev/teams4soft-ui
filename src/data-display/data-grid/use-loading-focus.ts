import * as React from "react";
import { useClientLayoutEffect } from "../../lib";

interface Captured { element: HTMLElement; inPaginator: boolean }

function isFocusable(element: HTMLElement): boolean {
  return element.isConnected && !(element as HTMLElement & { disabled?: boolean }).disabled && !element.closest("[inert]");
}

function focusedInside(root: HTMLElement | null): Captured | null {
  if (!root || typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (root.contains(active)) return { element: active, inPaginator: active.closest("[data-slot=paginator]") !== null };
  // El menú de filtro vive en un portal: el foco que vuelve es el de su botón.
  const menu = active.closest<HTMLElement>("[data-slot=filterMenu][data-filter-field]");
  if (menu) {
    const trigger = Array.from(root.querySelectorAll<HTMLElement>("[data-slot=filterButton]")).find(item => item.dataset.filterField === menu.dataset.filterField);
    if (trigger) return { element: trigger, inPaginator: false };
  }
  return null;
}

function nearestPaginatorControl(root: HTMLElement, previousLabel: string): HTMLElement | undefined {
  const controls = Array.from(root.querySelectorAll<HTMLElement>("[data-slot=paginator] button, [data-slot=paginator] select")).filter(isFocusable);
  return controls.find(control => control.getAttribute("aria-label") === previousLabel) ?? controls[0];
}

/**
 * `loading` deshabilita los controles y pone `inert` al contenido: el navegador suelta el foco al body.
 * El elemento enfocado se guarda al renderizar, antes de que el commit lo deshabilite, y se recupera al
 * quitar `inert`, salvo que el usuario o la página ya hayan movido el foco.
 */
export function useLoadingFocus(loading: boolean, contentRef: React.RefObject<HTMLElement | null>, previousPageLabel: string) {
  // Solo el commit marca la carga como vigente: un render descartado no puede dejar estado a medias.
  const committed = React.useRef(false);
  const captured = React.useRef<Captured | null>(null);
  // Un control que se deshabilita al pulsarlo (p. ej. "última página") ya perdió el foco antes de que empiece la carga.
  const lost = React.useRef<Captured | null>(null);
  React.useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const onOut = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (event.relatedTarget === null || event.relatedTarget === document.body) && (target as HTMLElement & { disabled?: boolean }).disabled) {
        lost.current = { element: target, inPaginator: target.closest("[data-slot=paginator]") !== null };
      }
    };
    const forget = (event: Event) => { if (event.target !== document.body) lost.current = null; };
    root.addEventListener("focusout", onOut);
    document.addEventListener("focusin", forget, true);
    document.addEventListener("pointerdown", forget, true);
    return () => {
      root.removeEventListener("focusout", onOut);
      document.removeEventListener("focusin", forget, true);
      document.removeEventListener("pointerdown", forget, true);
    };
  }, [contentRef]);
  if (loading && !committed.current) {
    const active = typeof document === "undefined" ? null : document.activeElement;
    captured.current = focusedInside(contentRef.current) ?? (!active || active === document.body ? lost.current : null);
  }
  useClientLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    if (loading) {
      root.setAttribute("inert", "");
      committed.current = true;
      return;
    }
    root.removeAttribute("inert");
    if (!committed.current) return;
    committed.current = false;
    const target = captured.current;
    captured.current = null;
    lost.current = null;
    if (!target) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (isFocusable(target.element)) target.element.focus();
    else if (target.inPaginator) nearestPaginatorControl(root, previousPageLabel)?.focus();
  }, [loading, previousPageLabel, contentRef]);
}
