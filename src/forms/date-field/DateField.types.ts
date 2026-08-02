import type * as React from "react";
import type { DateFieldValue, DisplayFormat } from "./date-utils";

export type { DateFieldValue, DisplayFormat };

/** Estado visible del texto del input. */
export type DateInputStatus = "idle" | "editing" | "invalid";

/** Slots personalizables vía `classNames`/`styles`. */
export interface DateFieldClassNames {
  root: string;
  label: string;
  control: string;
  input: string;
  clearButton: string;
  triggerButton: string;
  popover: string;
  calendarHeader: string;
  weekday: string;
  day: string;
  selectedDay: string;
  today: string;
  description: string;
  error: string;
}

export interface DateFieldProps {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  /** Se oculta automáticamente cuando hay `errorMessage`: el error la reemplaza. */
  description?: React.ReactNode;

  /**
   * Valor confirmado en ISO `YYYY-MM-DD`, o `null`. El campo es controlado:
   * mientras se escribe, el texto vive en estado interno y NO se emite hasta
   * confirmar con `Enter` o `blur`.
   */
  value: DateFieldValue;
  onValueChange: (value: DateFieldValue) => void;
  /** Se dispara tras intentar resolver el texto al perder el foco. */
  onBlur?: (value: DateFieldValue) => void;

  /** Locale BCP 47 para nombres de mes/día y la etiqueta accesible del día. */
  locale?: string;
  /** Formato del texto visible. El valor público sigue siendo ISO. */
  displayFormat?: DisplayFormat;
  /** Formatos aceptados que se muestran en la ayuda de error (solo informativo). */
  acceptedFormats?: string[];
  placeholder?: string;
  /** Pivote para años de dos dígitos: `<= pivote` → 2000s, resto → 1900s. */
  twoDigitYearPivot?: number;

  min?: DateFieldValue;
  max?: DateFieldValue;
  /** Deshabilita días concretos sin ocultarlos (recibe el ISO del día). */
  isDateUnavailable?: (value: Exclude<DateFieldValue, null>) => boolean;

  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  /** Se combina (OR) con la presencia de `errorMessage` y con el texto irresoluble. */
  invalid?: boolean;
  errorMessage?: React.ReactNode;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** 0 = domingo … 6 = sábado. */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  showTodayButton?: boolean;
  showClearButton?: boolean;
  calendarIcon?: React.ReactNode;

  className?: string;
  classNames?: Partial<DateFieldClassNames>;
  /** Conserva comportamiento y accesibilidad; elimina solo las clases visuales. */
  unstyled?: boolean;
  style?: React.CSSProperties;
  styles?: Partial<Record<keyof DateFieldClassNames, React.CSSProperties>>;
}
