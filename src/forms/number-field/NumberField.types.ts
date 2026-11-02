import type { TextFieldProps } from "../text-field/TextField.types";
import type { NumberFieldMode } from "./number-utils";

export type { NumberFieldMode };

export interface NumberFieldProps
  extends Omit<
    TextFieldProps,
    "value" | "defaultValue" | "onValueChange" | "type" | "inputMode" | "min" | "max"
  > {
  /** Valor numérico. `null` = vacío (nunca `0` ni `""`). */
  value?: number | null;
  defaultValue?: number | null;
  /** En cada cambio válido del número. */
  onValueChange?: (value: number | null) => void;
  /** Al salir (blur) o con Enter; no se repite si el valor no cambió desde la última confirmación. */
  onCommit?: (value: number | null) => void;
  /** @default "decimal" */
  mode?: NumberFieldMode;
  /** Atajo: `minFractionDigits = maxFractionDigits`. */
  fractionDigits?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  /** @default "$" */
  currencySymbol?: string;
  /** @default false */
  allowNegative?: boolean;
  /** Validación: marca `invalid`, no recorta. */
  min?: number;
  max?: number;
  /** @default "es-MX" */
  locale?: string;
  /** @default true */
  selectOnFocus?: boolean;
}
