import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn, mergeRefs } from "../../lib";
import {
  formatIso,
  isWithinRange,
  parseDateInput,
  parseIsoParts,
  toDateFieldValue,
  toIso,
} from "./date-utils";
import {
  addMonths,
  buildMonthGrid,
  getMonthYearLabel,
  getWeekdayLabels,
} from "./calendar";
import type { DateFieldProps, DateFieldValue } from "./DateField.types";

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

const DAYS_IN_WEEK = 7;

function IconCalendar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 18 9 12l6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

const rootBaseClassName = "grid gap-1.5";

const labelBaseClassName = "text-sm font-medium text-ui-foreground";

const requiredIndicatorBaseClassName = "ml-1 text-ui-danger";

const controlBaseClassName =
  "inline-flex h-10 w-full items-center gap-1 rounded-(--radius-ui-md) border border-ui-border bg-ui-background px-3 text-sm text-ui-foreground transition-colors focus-within:ring-2 focus-within:ring-ui-focus focus-within:ring-offset-2 focus-within:ring-offset-ui-background data-[invalid=true]:border-ui-danger data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50";

const inputBaseClassName =
  "w-full min-w-0 bg-transparent text-inherit outline-none placeholder:text-ui-foreground/40 disabled:cursor-not-allowed";

const auxButtonBaseClassName =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-(--radius-ui-sm) text-ui-foreground/60 outline-none transition-colors hover:bg-ui-muted hover:text-ui-foreground focus-visible:ring-2 focus-visible:ring-ui-focus disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

const popoverBaseClassName =
  "z-50 w-auto max-w-[calc(100vw-2rem)] rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-3 text-ui-foreground shadow-lg";

const calendarHeaderBaseClassName =
  "mb-2 flex items-center justify-between gap-2 text-sm font-medium";

const weekdayBaseClassName =
  "flex h-8 w-9 items-center justify-center text-xs font-normal text-ui-foreground/60";

const dayBaseClassName =
  "flex h-9 w-9 items-center justify-center rounded-(--radius-ui-sm) text-sm outline-none transition-colors hover:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus data-[outside=true]:text-ui-foreground/40 data-[unavailable=true]:cursor-not-allowed data-[unavailable=true]:opacity-40 data-[unavailable=true]:hover:bg-transparent motion-reduce:transition-none";

const selectedDayBaseClassName =
  "bg-ui-primary text-ui-primary-foreground hover:bg-ui-primary";

const todayBaseClassName = "font-semibold ring-1 ring-inset ring-ui-border";

const descriptionBaseClassName = "text-sm text-ui-foreground/60";

const errorBaseClassName = "text-sm text-ui-danger";

const footerBaseClassName =
  "mt-2 flex items-center justify-between gap-2 border-t border-ui-border pt-2";

const footerButtonBaseClassName =
  "rounded-(--radius-ui-sm) px-2 py-1 text-sm text-ui-foreground/80 outline-none transition-colors hover:bg-ui-muted focus-visible:ring-2 focus-visible:ring-ui-focus disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

/**
 * Campo de fecha con escritura directa y calendario accesible.
 *
 * El valor público es SIEMPRE la cadena ISO `YYYY-MM-DD` (o `null`); el texto
 * que se escribe vive en estado interno y solo se resuelve al confirmar
 * (`Enter` o `blur`). Una entrada irresoluble NO se borra: se conserva visible
 * con `aria-invalid` y un mensaje, para que la persona usuaria pueda
 * corregirla. Consulta `components_docs/diseno_date_field.md`.
 */
export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(
    {
      id,
      name,
      label,
      description,
      value,
      onValueChange,
      onBlur,
      locale = "es-EC",
      displayFormat = "dd/MM/yyyy",
      acceptedFormats,
      placeholder,
      twoDigitYearPivot,
      min,
      max,
      isDateUnavailable,
      required = false,
      disabled = false,
      readOnly = false,
      clearable = false,
      invalid = false,
      errorMessage,
      open,
      defaultOpen,
      onOpenChange,
      firstDayOfWeek = 1,
      showTodayButton = true,
      showClearButton = true,
      calendarIcon,
      className,
      classNames,
      unstyled = false,
      style,
      styles,
    },
    ref,
  ): React.ReactElement {
    const generatedId = React.useId();
    const inputId = id ?? `${generatedId}-input`;
    const descriptionId = `${generatedId}-description`;
    const errorId = `${generatedId}-error`;
    const monthLabelId = `${generatedId}-month`;

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = React.useMemo(() => mergeRefs(ref, inputRef), [ref]);
    const gridRef = React.useRef<HTMLDivElement | null>(null);

    const today = React.useMemo(() => toDateFieldValue(new Date()), []);

    // --- Texto del input, separado del valor confirmado ---------------------
    const [inputText, setInputText] = React.useState(() =>
      formatIso(value, { displayFormat }),
    );
    const [textInvalid, setTextInvalid] = React.useState(false);
    const syncRef = React.useRef({ value, displayFormat });

    React.useEffect(() => {
      const previous = syncRef.current;
      if (previous.value === value && previous.displayFormat === displayFormat) {
        return;
      }
      syncRef.current = { value, displayFormat };
      setInputText(formatIso(value, { displayFormat }));
      setTextInvalid(false);
    }, [value, displayFormat]);

    // --- Apertura (controlada / no controlada) ------------------------------
    const [openState, setOpenState] = React.useState(defaultOpen ?? false);
    const isOpenControlled = open !== undefined;
    const isOpen = isOpenControlled ? open : openState;

    // --- Mes visible y día activo (roving tabindex) -------------------------
    // Mes de partida al abrir: el del valor confirmado; si no hay valor, el mes
    // actual; y si hoy cae fuera del rango permitido, el primer mes permitido.
    const baseParts = React.useCallback(() => {
      const fromValue = value ? parseIsoParts(value) : null;
      if (fromValue) return fromValue;
      const todayParts = today ? parseIsoParts(today) : null;
      if (todayParts && today && isWithinRange(today, min, max)) {
        return todayParts;
      }
      const fromMin = min ? parseIsoParts(min) : null;
      return fromMin ?? todayParts ?? { year: 2000, month: 1, day: 1 };
    }, [value, min, max, today]);

    const [view, setView] = React.useState(() => {
      const base = baseParts();
      return { year: base.year, month: base.month };
    });
    const [activeIso, setActiveIso] = React.useState(() => {
      const base = baseParts();
      return toIso(base.year, base.month, base.day);
    });
    const [focusTick, setFocusTick] = React.useState(0);

    const handleOpenChange = (next: boolean) => {
      if (next && (disabled || readOnly)) return;
      if (next) {
        const base = baseParts();
        setView({ year: base.year, month: base.month });
        setActiveIso(toIso(base.year, base.month, base.day));
      }
      if (!isOpenControlled) setOpenState(next);
      onOpenChange?.(next);
    };

    // Devuelve el foco al día activo cuando se abre o cuando el teclado lo
    // desplaza. No se dispara al navegar de mes con los botones: allí el foco
    // debe permanecer en el botón de navegación.
    React.useEffect(() => {
      if (!isOpen) return;
      const node = gridRef.current?.querySelector<HTMLElement>(
        `[data-iso="${activeIso}"]`,
      );
      node?.focus();
    }, [isOpen, activeIso, focusTick]);

    // --- Estados derivados ---------------------------------------------------
    const hasErrorMessage = !isEmptyMessage(errorMessage);
    const autoErrorMessage = textInvalid
      ? acceptedFormats && acceptedFormats.length > 0
        ? `Fecha no válida. Formatos aceptados: ${acceptedFormats.join(", ")}.`
        : `Fecha no válida. Usa el formato ${displayFormat}.`
      : null;
    const resolvedError = hasErrorMessage ? errorMessage : autoErrorMessage;
    const hasErrorContent = !isEmptyMessage(resolvedError);
    const hasDescriptionContent =
      !isEmptyMessage(description) && !hasErrorContent;
    const effectiveInvalid = invalid || hasErrorContent;

    const describedBy =
      [
        hasDescriptionContent ? descriptionId : null,
        hasErrorContent ? errorId : null,
      ]
        .filter((token): token is string => Boolean(token))
        .join(" ") || undefined;

    // --- Confirmación del texto ---------------------------------------------
    const isSelectable = React.useCallback(
      (iso: string) =>
        isWithinRange(iso, min, max) && !(isDateUnavailable?.(iso) ?? false),
      [min, max, isDateUnavailable],
    );

    const commitValue = (next: DateFieldValue) => {
      setTextInvalid(false);
      if (next !== value) onValueChange(next);
      else setInputText(formatIso(next, { displayFormat }));
    };

    /** Resuelve `text`; devuelve el valor resultante (el vigente si no resuelve). */
    const confirmText = (text: string): DateFieldValue => {
      const result = parseDateInput(text, { displayFormat, twoDigitYearPivot });

      if (result.status === "empty") {
        if (value === null) {
          setTextInvalid(false);
          return null;
        }
        if (clearable) {
          commitValue(null);
          return null;
        }
        // Sin `clearable` el campo no puede quedar vacío: se restaura el texto.
        setInputText(formatIso(value, { displayFormat }));
        setTextInvalid(false);
        return value;
      }

      if (result.status === "invalid" || !isSelectable(result.value)) {
        setTextInvalid(true);
        return value;
      }

      commitValue(result.value);
      return result.value;
    };

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmText(inputText);
        return;
      }
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        handleOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown" && !isOpen) {
        event.preventDefault();
        handleOpenChange(true);
      }
    };

    const handleInputBlur = () => {
      const resolved = confirmText(inputText);
      onBlur?.(resolved);
    };

    const handleClear = () => {
      setInputText("");
      commitValue(null);
      inputRef.current?.focus();
    };

    // --- Calendario -----------------------------------------------------------
    const weekdayLabels = React.useMemo(
      () => getWeekdayLabels(locale, firstDayOfWeek),
      [locale, firstDayOfWeek],
    );
    const monthLabel = React.useMemo(
      () => getMonthYearLabel(view.year, view.month, locale),
      [view.year, view.month, locale],
    );
    const grid = React.useMemo(
      () => buildMonthGrid(view.year, view.month, firstDayOfWeek),
      [view.year, view.month, firstDayOfWeek],
    );
    const weeks = React.useMemo(() => {
      const rows: (typeof grid)[] = [];
      for (let index = 0; index < grid.length; index += DAYS_IN_WEEK) {
        rows.push(grid.slice(index, index + DAYS_IN_WEEK));
      }
      return rows;
    }, [grid]);

    const goToMonth = (delta: number) => {
      setView((current) => addMonths(current.year, current.month, delta));
    };

    const moveActiveDay = (deltaDays: number) => {
      const parts = parseIsoParts(activeIso);
      if (!parts) return;
      const cursor = new Date(parts.year, parts.month - 1, parts.day + deltaDays);
      cursor.setFullYear(parts.year, parts.month - 1, parts.day + deltaDays);
      const nextIso = toIso(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        cursor.getDate(),
      );
      setActiveIso(nextIso);
      setView({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      setFocusTick((tick) => tick + 1);
    };

    const moveActiveMonth = (monthDelta: number) => {
      const parts = parseIsoParts(activeIso);
      if (!parts) return;
      const next = addMonths(parts.year, parts.month, monthDelta);
      // El día se recorta al último día real del mes destino (31 → 28/30).
      const lastDay = new Date(next.year, next.month, 0);
      lastDay.setFullYear(next.year, next.month, 0);
      const day = Math.min(parts.day, lastDay.getDate());
      setActiveIso(toIso(next.year, next.month, day));
      setView(next);
      setFocusTick((tick) => tick + 1);
    };

    const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      const parts = parseIsoParts(activeIso);
      if (!parts) return;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          moveActiveDay(-1);
          break;
        case "ArrowRight":
          event.preventDefault();
          moveActiveDay(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActiveDay(-DAYS_IN_WEEK);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveActiveDay(DAYS_IN_WEEK);
          break;
        case "Home": {
          event.preventDefault();
          const date = new Date(parts.year, parts.month - 1, parts.day);
          date.setFullYear(parts.year, parts.month - 1, parts.day);
          const offset =
            (date.getDay() - firstDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK;
          moveActiveDay(-offset);
          break;
        }
        case "End": {
          event.preventDefault();
          const date = new Date(parts.year, parts.month - 1, parts.day);
          date.setFullYear(parts.year, parts.month - 1, parts.day);
          const offset =
            (date.getDay() - firstDayOfWeek + DAYS_IN_WEEK) % DAYS_IN_WEEK;
          moveActiveDay(DAYS_IN_WEEK - 1 - offset);
          break;
        }
        case "PageUp":
          event.preventDefault();
          moveActiveMonth(event.shiftKey ? -12 : -1);
          break;
        case "PageDown":
          event.preventDefault();
          moveActiveMonth(event.shiftKey ? 12 : 1);
          break;
        default:
          break;
      }
    };

    const handleSelectDay = (iso: string) => {
      if (!isSelectable(iso)) return;
      setInputText(formatIso(iso, { displayFormat }));
      commitValue(iso);
      handleOpenChange(false);
    };

    const showInputClear =
      clearable && inputText.length > 0 && !disabled && !readOnly;
    const todaySelectable = today !== null && isSelectable(today);

    const rootClassName = unstyled
      ? cn(className, classNames?.root)
      : cn(rootBaseClassName, className, classNames?.root);

    return (
      <div
        className={rootClassName}
        style={{ ...styles?.root, ...style }}
        data-invalid={effectiveInvalid || undefined}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-required={required || undefined}
        data-open={isOpen || undefined}
      >
        {!isEmptyMessage(label) ? (
          <label
            htmlFor={inputId}
            className={cn(!unstyled && labelBaseClassName, classNames?.label)}
            style={styles?.label}
          >
            {label}
            {required ? (
              <span className={cn(!unstyled && requiredIndicatorBaseClassName)}>
                <span aria-hidden="true">*</span>
                <span className="sr-only"> (requerido)</span>
              </span>
            ) : null}
          </label>
        ) : null}

        <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverPrimitive.Anchor asChild>
            <div
              className={cn(
                !unstyled && controlBaseClassName,
                classNames?.control,
              )}
              style={styles?.control}
              data-invalid={effectiveInvalid || undefined}
              data-disabled={disabled || undefined}
              data-readonly={readOnly || undefined}
            >
              <input
                ref={mergedRef}
                id={inputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={inputText}
                placeholder={placeholder ?? displayFormat}
                disabled={disabled}
                readOnly={readOnly}
                required={required}
                aria-invalid={effectiveInvalid || undefined}
                aria-required={required || undefined}
                aria-describedby={describedBy}
                onChange={(event) => {
                  setInputText(event.target.value);
                  if (textInvalid) setTextInvalid(false);
                }}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                className={cn(
                  !unstyled && inputBaseClassName,
                  classNames?.input,
                )}
                style={styles?.input}
              />
              {/* El input visible contiene texto localizado; el envío nativo de
                  formularios usa el valor ISO canónico. */}
              {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
              {showInputClear ? (
                <button
                  type="button"
                  aria-label="Limpiar fecha"
                  onClick={handleClear}
                  className={cn(
                    !unstyled && auxButtonBaseClassName,
                    classNames?.clearButton,
                  )}
                  style={styles?.clearButton}
                >
                  <IconX />
                </button>
              ) : null}
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label="Abrir calendario"
                  disabled={disabled || readOnly}
                  className={cn(
                    !unstyled && auxButtonBaseClassName,
                    classNames?.triggerButton,
                  )}
                  style={styles?.triggerButton}
                >
                  {calendarIcon ?? <IconCalendar />}
                </button>
              </PopoverPrimitive.Trigger>
            </div>
          </PopoverPrimitive.Anchor>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={4}
              aria-label={typeof label === "string" ? label : "Calendario"}
              onOpenAutoFocus={(event) => {
                // El foco entra en el día activo, no en el contenedor.
                event.preventDefault();
                setFocusTick((tick) => tick + 1);
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                inputRef.current?.focus();
              }}
              className={cn(
                !unstyled && popoverBaseClassName,
                classNames?.popover,
              )}
              style={styles?.popover}
            >
              <div
                className={cn(
                  !unstyled && calendarHeaderBaseClassName,
                  classNames?.calendarHeader,
                )}
                style={styles?.calendarHeader}
              >
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => goToMonth(-1)}
                  className={cn(!unstyled && auxButtonBaseClassName)}
                >
                  <IconChevron direction="left" />
                </button>
                <span id={monthLabelId}>{monthLabel}</span>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => goToMonth(1)}
                  className={cn(!unstyled && auxButtonBaseClassName)}
                >
                  <IconChevron direction="right" />
                </button>
              </div>

              {/* Anuncia el cambio de mes a los lectores de pantalla. */}
              <div aria-live="polite" className="sr-only">
                {monthLabel}
              </div>

              <div
                ref={gridRef}
                role="grid"
                aria-labelledby={monthLabelId}
                onKeyDown={handleGridKeyDown}
              >
                <div role="row" className={unstyled ? undefined : "flex"}>
                  {weekdayLabels.map((weekday) => (
                    <span
                      key={weekday}
                      role="columnheader"
                      aria-label={weekday}
                      className={cn(
                        !unstyled && weekdayBaseClassName,
                        classNames?.weekday,
                      )}
                      style={styles?.weekday}
                    >
                      {weekday}
                    </span>
                  ))}
                </div>
                {weeks.map((week, weekIndex) => (
                  <div
                    key={week[0]?.iso ?? weekIndex}
                    role="row"
                    className={unstyled ? undefined : "flex"}
                  >
                    {week.map((cell) => {
                      const selected = value === cell.iso;
                      const unavailable = !isSelectable(cell.iso);
                      const isToday = today === cell.iso;
                      return (
                        <button
                          key={cell.iso}
                          type="button"
                          // `role="gridcell"` (en vez del `button` implícito)
                          // permite exponer `aria-selected`, que no es válido
                          // en `role="button"`, conservando el patrón ARIA de
                          // calendario.
                          role="gridcell"
                          data-iso={cell.iso}
                          data-selected={selected || undefined}
                          data-today={isToday || undefined}
                          data-unavailable={unavailable || undefined}
                          data-outside={!cell.inCurrentMonth || undefined}
                          aria-selected={selected}
                          aria-disabled={unavailable || undefined}
                          aria-current={isToday ? "date" : undefined}
                          tabIndex={cell.iso === activeIso ? 0 : -1}
                          onClick={() => handleSelectDay(cell.iso)}
                          onFocus={() => setActiveIso(cell.iso)}
                          className={cn(
                            !unstyled && dayBaseClassName,
                            !unstyled && selected && selectedDayBaseClassName,
                            !unstyled && isToday && !selected && todayBaseClassName,
                            classNames?.day,
                            selected && classNames?.selectedDay,
                            isToday && classNames?.today,
                          )}
                          style={{
                            ...styles?.day,
                            ...(selected ? styles?.selectedDay : undefined),
                            ...(isToday ? styles?.today : undefined),
                          }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {showTodayButton || (showClearButton && !required) ? (
                <div className={unstyled ? undefined : footerBaseClassName}>
                  {showTodayButton ? (
                    <button
                      type="button"
                      disabled={!todaySelectable}
                      onClick={() => {
                        if (today) handleSelectDay(today);
                      }}
                      className={cn(!unstyled && footerButtonBaseClassName)}
                    >
                      Hoy
                    </button>
                  ) : (
                    <span />
                  )}
                  {showClearButton && !required ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInputText("");
                        commitValue(null);
                        handleOpenChange(false);
                      }}
                      className={cn(!unstyled && footerButtonBaseClassName)}
                    >
                      Limpiar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>

        {hasDescriptionContent ? (
          <p
            id={descriptionId}
            className={cn(
              !unstyled && descriptionBaseClassName,
              classNames?.description,
            )}
            style={styles?.description}
          >
            {description}
          </p>
        ) : null}
        {hasErrorContent ? (
          <p
            id={errorId}
            className={cn(!unstyled && errorBaseClassName, classNames?.error)}
            style={styles?.error}
          >
            {resolvedError}
          </p>
        ) : null}
      </div>
    );
  },
);

DateField.displayName = "DateField";

export type { DateFieldValue };
