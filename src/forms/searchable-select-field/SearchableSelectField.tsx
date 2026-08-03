import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn, mergeRefs } from "../../lib";
import { defaultFilter, normalizeText, resolveText } from "./select-utils";
import type {
  ResolutionStrategy,
  SearchableSelectFieldProps,
} from "./SearchableSelectField.types";

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

const DEFAULT_STRATEGIES: ResolutionStrategy[] = [
  "label-exact",
  "value-exact",
  "label-prefix",
];

function IconChevronDown() {
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
      <path d="m6 9 6 6 6-6" />
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
  "z-50 max-h-72 overflow-hidden rounded-(--radius-ui-md) border border-ui-border bg-ui-background p-1 text-ui-foreground shadow-lg";

const listboxBaseClassName = "max-h-64 overflow-y-auto outline-none";

const optionBaseClassName =
  "flex cursor-pointer items-center gap-2 rounded-(--radius-ui-sm) px-2 py-1.5 text-sm outline-none data-[active=true]:bg-ui-muted data-[selected=true]:font-medium data-[selected=true]:text-ui-primary data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50";

const emptyBaseClassName = "px-2 py-3 text-center text-sm text-ui-foreground/60";

const descriptionBaseClassName = "text-sm text-ui-foreground/60";

const errorBaseClassName = "text-sm text-ui-danger";

const valuePreviewBaseClassName =
  "flex shrink-0 items-center text-ui-foreground/60";

/**
 * Select de una sola opción con filtrado por texto sobre colecciones locales.
 *
 * Implementa el patrón ARIA combobox + listbox sobre Radix Popover (que aporta
 * portal, descarte y posicionamiento). Es genérico en `TOption`/`TValue` y usa
 * accesores tipados, nunca nombres de propiedad en string. Nunca muta
 * `options`. Consulta `components_docs/diseno_searchable_select_field.md`.
 *
 * No usa `forwardRef`: envolver una función genérica en `forwardRef` borra los
 * parámetros de tipo. Para foco programático existe la prop `inputRef`.
 */
export function SearchableSelectField<TOption, TValue>({
  id,
  name,
  label,
  description,
  placeholder,
  value,
  onValueChange,
  inputValue,
  defaultInputValue,
  onInputValueChange,
  options,
  getOptionValue,
  getOptionLabel,
  getOptionDisabled,
  getOptionKeywords,
  filterOption,
  resolutionStrategy = DEFAULT_STRATEGIES,
  sortOptions,
  unmatchedBehavior = "show-error",
  required = false,
  disabled = false,
  readOnly = false,
  clearable = false,
  invalid = false,
  errorMessage,
  autoSelectFirst = false,
  open,
  defaultOpen,
  onOpenChange,
  emptyMessage = "Sin resultados",
  loading = false,
  loadingMessage = "Cargando…",
  renderOption,
  renderValue,
  inputRef,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: SearchableSelectFieldProps<TOption, TValue>): React.ReactElement {
  const generatedId = React.useId();
  const controlId = id ?? `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;

  const localInputRef = React.useRef<HTMLInputElement | null>(null);
  const mergedInputRef = React.useMemo(
    () => mergeRefs(inputRef, localInputRef),
    [inputRef],
  );

  const selectedOption = React.useMemo(
    () =>
      value === null
        ? null
        : (options.find((option) => getOptionValue(option) === value) ?? null),
    [options, value, getOptionValue],
  );
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : "";

  // --- Texto del input (controlado / no controlado) -------------------------
  const isTextControlled = inputValue !== undefined;
  const [internalText, setInternalText] = React.useState(
    defaultInputValue ?? selectedLabel,
  );
  const text = isTextControlled ? inputValue : internalText;

  const setText = React.useCallback(
    (next: string) => {
      if (!isTextControlled) setInternalText(next);
      onInputValueChange?.(next);
    },
    [isTextControlled, onInputValueChange],
  );

  const [unresolved, setUnresolved] = React.useState(false);
  /** `null` = sin filtro (se muestran todas). Un string filtra la lista. */
  const [filterQuery, setFilterQuery] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Sincroniza el texto cuando `value` cambia desde fuera. No notifica
  // `onInputValueChange`: el cambio lo originó el consumidor, no el campo.
  const lastValueRef = React.useRef(value);
  React.useEffect(() => {
    if (lastValueRef.current === value) return;
    lastValueRef.current = value;
    if (!isTextControlled) setInternalText(selectedLabel);
    setUnresolved(false);
    setFilterQuery(null);
  }, [value, selectedLabel, isTextControlled]);

  // --- Apertura (controlada / no controlada) --------------------------------
  const [openState, setOpenState] = React.useState(defaultOpen ?? false);
  const isOpenControlled = open !== undefined;
  const isOpen = isOpenControlled ? open : openState;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (next && (disabled || readOnly)) return;
      if (!isOpenControlled) setOpenState(next);
      onOpenChange?.(next);
    },
    [disabled, readOnly, isOpenControlled, onOpenChange],
  );

  // --- Opciones visibles ----------------------------------------------------
  // `sortOptions` se aplica sobre una COPIA: el arreglo del consumidor nunca
  // se reordena in-place.
  const orderedOptions = React.useMemo(
    () => (sortOptions ? [...options].sort(sortOptions) : options),
    [options, sortOptions],
  );

  const visibleOptions = React.useMemo(() => {
    if (loading) return [];
    if (filterQuery === null || normalizeText(filterQuery) === "") {
      return orderedOptions;
    }
    return orderedOptions.filter((option) =>
      filterOption
        ? filterOption(option, filterQuery)
        : defaultFilter(
            getOptionLabel(option),
            getOptionKeywords?.(option) ?? [],
            filterQuery,
          ),
    );
  }, [
    loading,
    orderedOptions,
    filterQuery,
    filterOption,
    getOptionLabel,
    getOptionKeywords,
  ]);

  const isDisabledOption = React.useCallback(
    (option: TOption) => getOptionDisabled?.(option) ?? false,
    [getOptionDisabled],
  );

  const firstEnabledIndex = React.useCallback(
    (list: TOption[]) => list.findIndex((option) => !isDisabledOption(option)),
    [isDisabledOption],
  );

  const optionId = (index: number) => `${generatedId}-option-${index}`;

  // Mantiene el descendiente activo dentro de la lista visible: si el filtro
  // reduce las opciones, un índice viejo dejaría de existir.
  React.useEffect(() => {
    if (activeIndex >= visibleOptions.length) setActiveIndex(-1);
  }, [activeIndex, visibleOptions.length]);

  React.useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({
      block: "nearest",
    });
    // `optionId` es estable respecto a `generatedId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex, generatedId]);

  // --- Estados derivados ----------------------------------------------------
  const hasErrorMessage = !isEmptyMessage(errorMessage);
  const autoErrorMessage = unresolved
    ? "No hay ninguna opción que coincida con el texto."
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

  // --- Acciones -------------------------------------------------------------
  const selectOption = (option: TOption, keepFocus = true) => {
    if (isDisabledOption(option)) return;
    setUnresolved(false);
    setFilterQuery(null);
    setActiveIndex(-1);
    setText(getOptionLabel(option));
    onValueChange(getOptionValue(option), option);
    setOpen(false);
    // Con `Tab` el foco debe seguir su camino natural: refocalizar el input
    // atraparía a la persona usuaria en el campo.
    if (keepFocus) localInputRef.current?.focus();
  };

  const clearSelection = () => {
    setUnresolved(false);
    setFilterQuery(null);
    setActiveIndex(-1);
    setText("");
    onValueChange(null, null);
    localInputRef.current?.focus();
  };

  /** Resuelve el texto libre según `resolutionStrategy` y `unmatchedBehavior`. */
  const confirmText = () => {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      setUnresolved(false);
      if (value === null) return;
      if (clearable) {
        onValueChange(null, null);
        return;
      }
      setText(selectedLabel);
      return;
    }

    const match = resolveText(trimmed, orderedOptions, {
      strategies: resolutionStrategy,
      getLabel: getOptionLabel,
      getValueString: (option) => String(getOptionValue(option)),
    });

    if (match && !isDisabledOption(match)) {
      setUnresolved(false);
      setFilterQuery(null);
      setText(getOptionLabel(match));
      if (getOptionValue(match) !== value) {
        onValueChange(getOptionValue(match), match);
      }
      return;
    }

    switch (unmatchedBehavior) {
      case "revert":
        setUnresolved(false);
        setFilterQuery(null);
        setText(selectedLabel);
        break;
      case "clear":
        setUnresolved(false);
        setFilterQuery(null);
        setText("");
        onValueChange(null, null);
        break;
      case "show-error":
      default:
        setUnresolved(true);
        break;
    }
  };

  const restoreConfirmedText = () => {
    setUnresolved(false);
    setFilterQuery(null);
    setActiveIndex(-1);
    setText(selectedLabel);
  };

  /**
   * Avanza al siguiente/anterior habilitado, con envolvente y saltando disabled.
   *
   * Usa el actualizador funcional a propósito: al mantener pulsada la flecha,
   * React puede procesar varias pulsaciones en el mismo lote sin re-renderizar
   * entre ellas, y leer `activeIndex` del closure haría que la segunda partiera
   * de un valor obsoleto y se perdieran pasos.
   */
  const moveActive = (direction: 1 | -1) => {
    const total = visibleOptions.length;
    if (total === 0) return;
    setActiveIndex((current) => {
      let index = current;
      for (let step = 0; step < total; step += 1) {
        index =
          index === -1
            ? direction === 1
              ? 0
              : total - 1
            : (index + direction + total) % total;
        const candidate = visibleOptions[index];
        if (candidate && !isDisabledOption(candidate)) return index;
      }
      return current;
    });
  };

  const moveToEdge = (edge: "first" | "last") => {
    const indexes =
      edge === "first"
        ? visibleOptions.map((_, index) => index)
        : visibleOptions.map((_, index) => visibleOptions.length - 1 - index);
    for (const index of indexes) {
      const candidate = visibleOptions[index];
      if (candidate && !isDisabledOption(candidate)) {
        setActiveIndex(index);
        return;
      }
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setOpen(true);
          if (!event.altKey) moveToEdge("first");
          return;
        }
        moveActive(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          setOpen(true);
          moveToEdge("last");
          return;
        }
        moveActive(-1);
        return;
      case "Home":
        if (!isOpen) return;
        event.preventDefault();
        moveToEdge("first");
        return;
      case "End":
        if (!isOpen) return;
        event.preventDefault();
        moveToEdge("last");
        return;
      case "Enter": {
        event.preventDefault();
        const active = isOpen && activeIndex >= 0 ? visibleOptions[activeIndex] : undefined;
        if (active) {
          selectOption(active);
          return;
        }
        confirmText();
        setOpen(false);
        return;
      }
      case "Escape":
        if (!isOpen) return;
        event.preventDefault();
        restoreConfirmedText();
        setOpen(false);
        return;
      case "Tab": {
        const active =
          isOpen && activeIndex >= 0 ? visibleOptions[activeIndex] : undefined;
        if (active) selectOption(active, false);
        else if (isOpen) setOpen(false);
        return;
      }
      default:
        return;
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setUnresolved(false);
    setText(next);
    setFilterQuery(next);
    if (!isOpen) setOpen(true);
    if (autoSelectFirst) {
      const list = next.trim()
        ? orderedOptions.filter((option) =>
            filterOption
              ? filterOption(option, next)
              : defaultFilter(
                  getOptionLabel(option),
                  getOptionKeywords?.(option) ?? [],
                  next,
                ),
          )
        : orderedOptions;
      setActiveIndex(firstEnabledIndex(list));
    } else {
      setActiveIndex(-1);
    }
  };

  const showClear =
    clearable && text.length > 0 && !disabled && !readOnly;

  const rootClassName = unstyled
    ? cn(className, classNames?.root)
    : cn(rootBaseClassName, className, classNames?.root);

  const listContent = loading ? (
    <div
      className={cn(!unstyled && emptyBaseClassName, classNames?.empty)}
      style={styles?.empty}
    >
      {loadingMessage}
    </div>
  ) : visibleOptions.length === 0 ? (
    <div
      className={cn(!unstyled && emptyBaseClassName, classNames?.empty)}
      style={styles?.empty}
    >
      {emptyMessage}
    </div>
  ) : null;

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
          htmlFor={controlId}
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

      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) restoreConfirmedText();
          setOpen(next);
        }}
      >
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
            {renderValue && selectedOption ? (
              <span
                className={unstyled ? undefined : valuePreviewBaseClassName}
                aria-hidden="true"
              >
                {renderValue(selectedOption)}
              </span>
            ) : null}
            <input
              ref={mergedInputRef}
              id={controlId}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
              }
              aria-invalid={effectiveInvalid || undefined}
              aria-required={required || undefined}
              aria-describedby={describedBy}
              value={text}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onClick={() => {
                if (!isOpen) setOpen(true);
              }}
              className={cn(!unstyled && inputBaseClassName, classNames?.input)}
              style={styles?.input}
            />
            {/* El input visible muestra la etiqueta; el envío nativo usa el valor. */}
            {name ? (
              <input type="hidden" name={name} value={value === null ? "" : String(value)} />
            ) : null}
            {showClear ? (
              <button
                type="button"
                aria-label="Limpiar selección"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearSelection}
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
                // Duplica una acción ya disponible en el input
                // (`ArrowDown`/`Alt+ArrowDown`), así que queda fuera del orden
                // de tabulación para no añadir una parada redundante.
                tabIndex={-1}
                aria-label="Abrir opciones"
                disabled={disabled || readOnly}
                onMouseDown={(event) => event.preventDefault()}
                className={cn(
                  !unstyled && auxButtonBaseClassName,
                  classNames?.trigger,
                )}
                style={styles?.trigger}
              >
                <IconChevronDown />
              </button>
            </PopoverPrimitive.Trigger>
          </div>
        </PopoverPrimitive.Anchor>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            // El foco NUNCA sale del input: es el patrón combobox.
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className={cn(
              !unstyled && popoverBaseClassName,
              classNames?.popover,
            )}
            style={{
              width: "var(--radix-popover-trigger-width)",
              ...styles?.popover,
            }}
          >
            <div
              id={listboxId}
              role="listbox"
              aria-label={typeof label === "string" ? label : "Opciones"}
              className={cn(
                !unstyled && listboxBaseClassName,
                classNames?.listbox,
              )}
              style={styles?.listbox}
            >
              {listContent ??
                visibleOptions.map((option, index) => {
                  const optionValue = getOptionValue(option);
                  const selected = value !== null && optionValue === value;
                  const active = index === activeIndex;
                  const optionDisabled = isDisabledOption(option);
                  return (
                    <div
                      key={String(optionValue)}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={optionDisabled || undefined}
                      data-selected={selected || undefined}
                      data-active={active || undefined}
                      data-disabled={optionDisabled || undefined}
                      // Evita que el input pierda el foco al pulsar: el patrón
                      // combobox mantiene el foco en el input todo el tiempo.
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => {
                        if (!optionDisabled) setActiveIndex(index);
                      }}
                      onClick={() => selectOption(option)}
                      className={cn(
                        !unstyled && optionBaseClassName,
                        classNames?.option,
                      )}
                      style={styles?.option}
                    >
                      {renderOption
                        ? renderOption(option, { selected, active })
                        : getOptionLabel(option)}
                    </div>
                  );
                })}
            </div>
            {/* Anuncia la cantidad de resultados a los lectores de pantalla. */}
            <div aria-live="polite" className="sr-only">
              {loading ? "" : `${visibleOptions.length} opciones disponibles`}
            </div>
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
}

SearchableSelectField.displayName = "SearchableSelectField";
