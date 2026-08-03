import type * as React from "react";

export type SkeletonShape = "text" | "rect" | "circle";
export type SkeletonAnimation = "pulse" | "wave" | "none";

export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Default `"text"`. */
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  /** Número de líneas. Solo aplica con `shape="text"`. Default 1. */
  lines?: number;
  /** Default `"pulse"`. */
  animation?: SkeletonAnimation;
  unstyled?: boolean;
}
