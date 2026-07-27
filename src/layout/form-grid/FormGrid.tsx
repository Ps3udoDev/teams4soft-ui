import * as React from "react";
import { cn } from "../../lib";
import type {
  FormGridItemProps,
  FormGridProps,
  ResponsiveBreakpoint,
  ResponsiveValue,
} from "./FormGrid.types";

// ---------------------------------------------------------------------------
// Mapas estáticos de clases Tailwind.
//
// Tailwind escanea el código fuente en busca de strings de clase LITERALES;
// nunca ve clases construidas dinámicamente (p. ej. `grid-cols-${n}`). Por
// eso cada combinación posible se enumera aquí como string literal, en vez
// de concatenarse en tiempo de ejecución.
// ---------------------------------------------------------------------------

type ColumnsValue = 1 | 2 | 3 | 4 | 6 | 12;
type SpanValue = 1 | 2 | 3 | 4 | 6 | 12 | "full";
type StartValue = number | "auto";

const columnsBase: Record<ColumnsValue, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

const columnsByBreakpoint: Record<
  Exclude<ResponsiveBreakpoint, "base">,
  Record<ColumnsValue, string>
> = {
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    6: "sm:grid-cols-6",
    12: "sm:grid-cols-12",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    6: "md:grid-cols-6",
    12: "md:grid-cols-12",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    6: "lg:grid-cols-6",
    12: "lg:grid-cols-12",
  },
  xl: {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    6: "xl:grid-cols-6",
    12: "xl:grid-cols-12",
  },
  "2xl": {
    1: "2xl:grid-cols-1",
    2: "2xl:grid-cols-2",
    3: "2xl:grid-cols-3",
    4: "2xl:grid-cols-4",
    6: "2xl:grid-cols-6",
    12: "2xl:grid-cols-12",
  },
};

const spanBase: Record<SpanValue, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  6: "col-span-6",
  12: "col-span-12",
  full: "col-span-full",
};

const spanByBreakpoint: Record<
  Exclude<ResponsiveBreakpoint, "base">,
  Record<SpanValue, string>
> = {
  sm: {
    1: "sm:col-span-1",
    2: "sm:col-span-2",
    3: "sm:col-span-3",
    4: "sm:col-span-4",
    6: "sm:col-span-6",
    12: "sm:col-span-12",
    full: "sm:col-span-full",
  },
  md: {
    1: "md:col-span-1",
    2: "md:col-span-2",
    3: "md:col-span-3",
    4: "md:col-span-4",
    6: "md:col-span-6",
    12: "md:col-span-12",
    full: "md:col-span-full",
  },
  lg: {
    1: "lg:col-span-1",
    2: "lg:col-span-2",
    3: "lg:col-span-3",
    4: "lg:col-span-4",
    6: "lg:col-span-6",
    12: "lg:col-span-12",
    full: "lg:col-span-full",
  },
  xl: {
    1: "xl:col-span-1",
    2: "xl:col-span-2",
    3: "xl:col-span-3",
    4: "xl:col-span-4",
    6: "xl:col-span-6",
    12: "xl:col-span-12",
    full: "xl:col-span-full",
  },
  "2xl": {
    1: "2xl:col-span-1",
    2: "2xl:col-span-2",
    3: "2xl:col-span-3",
    4: "2xl:col-span-4",
    6: "2xl:col-span-6",
    12: "2xl:col-span-12",
    full: "2xl:col-span-full",
  },
};

const startBase: Record<StartValue, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
  8: "col-start-8",
  9: "col-start-9",
  10: "col-start-10",
  11: "col-start-11",
  12: "col-start-12",
  auto: "col-start-auto",
};

const startByBreakpoint: Record<
  Exclude<ResponsiveBreakpoint, "base">,
  Record<StartValue, string>
> = {
  sm: {
    1: "sm:col-start-1",
    2: "sm:col-start-2",
    3: "sm:col-start-3",
    4: "sm:col-start-4",
    5: "sm:col-start-5",
    6: "sm:col-start-6",
    7: "sm:col-start-7",
    8: "sm:col-start-8",
    9: "sm:col-start-9",
    10: "sm:col-start-10",
    11: "sm:col-start-11",
    12: "sm:col-start-12",
    auto: "sm:col-start-auto",
  },
  md: {
    1: "md:col-start-1",
    2: "md:col-start-2",
    3: "md:col-start-3",
    4: "md:col-start-4",
    5: "md:col-start-5",
    6: "md:col-start-6",
    7: "md:col-start-7",
    8: "md:col-start-8",
    9: "md:col-start-9",
    10: "md:col-start-10",
    11: "md:col-start-11",
    12: "md:col-start-12",
    auto: "md:col-start-auto",
  },
  lg: {
    1: "lg:col-start-1",
    2: "lg:col-start-2",
    3: "lg:col-start-3",
    4: "lg:col-start-4",
    5: "lg:col-start-5",
    6: "lg:col-start-6",
    7: "lg:col-start-7",
    8: "lg:col-start-8",
    9: "lg:col-start-9",
    10: "lg:col-start-10",
    11: "lg:col-start-11",
    12: "lg:col-start-12",
    auto: "lg:col-start-auto",
  },
  xl: {
    1: "xl:col-start-1",
    2: "xl:col-start-2",
    3: "xl:col-start-3",
    4: "xl:col-start-4",
    5: "xl:col-start-5",
    6: "xl:col-start-6",
    7: "xl:col-start-7",
    8: "xl:col-start-8",
    9: "xl:col-start-9",
    10: "xl:col-start-10",
    11: "xl:col-start-11",
    12: "xl:col-start-12",
    auto: "xl:col-start-auto",
  },
  "2xl": {
    1: "2xl:col-start-1",
    2: "2xl:col-start-2",
    3: "2xl:col-start-3",
    4: "2xl:col-start-4",
    5: "2xl:col-start-5",
    6: "2xl:col-start-6",
    7: "2xl:col-start-7",
    8: "2xl:col-start-8",
    9: "2xl:col-start-9",
    10: "2xl:col-start-10",
    11: "2xl:col-start-11",
    12: "2xl:col-start-12",
    auto: "2xl:col-start-auto",
  },
};

const gapClassName: Record<NonNullable<FormGridProps["gap"]>, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const alignClassName: Record<NonNullable<FormGridProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

function isResponsiveObject<T>(
  value: ResponsiveValue<T> | undefined,
): value is Partial<Record<ResponsiveBreakpoint, T>> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Resuelve un `ResponsiveValue<T>` a un string de clases Tailwind, usando
 * exclusivamente los mapas estáticos recibidos (nunca concatena clases).
 *
 * - Valor escalar → clase del mapa base.
 * - Objeto `{ base, sm, md, lg, xl, "2xl" }` → por cada clave presente,
 *   `base` resuelve contra `baseScalarMap` y cada breakpoint contra
 *   `breakpointMaps[bp]`.
 */
function resolveResponsive<T extends string | number>(
  value: ResponsiveValue<T> | undefined,
  baseScalarMap: Record<T, string>,
  breakpointMaps: Record<Exclude<ResponsiveBreakpoint, "base">, Record<T, string>>,
): string {
  if (value === undefined) {
    return "";
  }

  if (!isResponsiveObject(value)) {
    return baseScalarMap[value] ?? "";
  }

  const classes: string[] = [];
  for (const bp of Object.keys(value) as ResponsiveBreakpoint[]) {
    const v = value[bp];
    if (v === undefined) continue;
    if (bp === "base") {
      const cls = baseScalarMap[v];
      if (cls) classes.push(cls);
    } else {
      const cls = breakpointMaps[bp]?.[v];
      if (cls) classes.push(cls);
    }
  }
  return classes.join(" ");
}

const rootGridClassName = "grid";
const denseClassName = "grid-flow-dense";

/**
 * Grid responsivo para formularios, construido sobre CSS Grid + Tailwind.
 * Consulta `components_docs/migration/08_form_grid.md` para el contrato
 * completo. Todas las clases de columnas/spans/starts se resuelven contra
 * mapas estáticos literales (`resolveResponsive`): Tailwind no detecta
 * clases construidas dinámicamente en ejecución.
 *
 * Presentacional: no agrega roles ARIA.
 */
export const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  (
    {
      columns,
      gap,
      align,
      dense = false,
      className,
      unstyled = false,
      children,
      ...rest
    },
    ref,
  ) => {
    const columnsClassName = resolveResponsive(
      columns,
      columnsBase,
      columnsByBreakpoint,
    );

    return (
      <div
        ref={ref}
        className={cn(
          !unstyled && rootGridClassName,
          !unstyled && columnsClassName,
          !unstyled && gap && gapClassName[gap],
          !unstyled && align && alignClassName[align],
          dense && !unstyled && denseClassName,
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
) as React.ForwardRefExoticComponent<
  FormGridProps & React.RefAttributes<HTMLDivElement>
> & {
  Item: typeof FormGridItem;
};

FormGrid.displayName = "FormGrid";

export const FormGridItem = React.forwardRef<HTMLDivElement, FormGridItemProps>(
  ({ span, start, className, unstyled = false, children, ...rest }, ref) => {
    const spanClassName = resolveResponsive(span, spanBase, spanByBreakpoint);
    const startClassName = resolveResponsive(
      start,
      startBase,
      startByBreakpoint,
    );

    return (
      <div
        ref={ref}
        className={cn(
          !unstyled && spanClassName,
          !unstyled && startClassName,
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

FormGridItem.displayName = "FormGrid.Item";

FormGrid.Item = FormGridItem;
