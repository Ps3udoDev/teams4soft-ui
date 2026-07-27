import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de utilidades
 * Tailwind (tailwind-merge). Las clases pasadas al final tienen prioridad,
 * de modo que las clases custom del consumidor sobrescriben las internas.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
