import * as React from "react";
import { cn, mergeRefs } from "../../lib";
import { FormFieldContext, useFormFieldContextOrThrow } from "./FormField.context";
import type { FormFieldContextValue } from "./FormField.context";
import type {
  FormFieldControlProps,
  FormFieldDescriptionProps,
  FormFieldErrorProps,
  FormFieldLabelProps,
  FormFieldProps,
  FormFieldRootProps,
} from "./FormField.types";

export { useFormFieldContext } from "./FormField.context";
export type { FormFieldContextValue } from "./FormField.context";

type UnknownProps = Record<string, unknown>;

function isEmptyMessage(children: React.ReactNode): boolean {
  return children === undefined || children === null || children === "";
}

/**
 * Recorre TODO el subárbol de hijos de `FormField.Root` (no solo los hijos
 * directos) para saber, de forma síncrona (sin efectos ni doble render), si
 * hay un `FormField.Error` y/o `FormField.Description` con contenido en
 * cualquier profundidad — p. ej. envuelto en un `<div>` junto a un icono.
 * El error reemplaza visualmente a la descripción: si hay contenido de
 * error, la descripción no cuenta. No es necesario clonar los nodos
 * anidados aquí: `FormFieldError`/`FormFieldDescription` ya leen su id
 * desde el contexto por sí mismos; esta función solo detecta su presencia.
 */
function scanMessageContent(children: React.ReactNode): {
  hasErrorContent: boolean;
  hasDescriptionContent: boolean;
} {
  let hasErrorContent = false;
  let hasDescriptionRaw = false;

  function walk(node: React.ReactNode): void {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as UnknownProps;
      if (child.type === FormFieldError) {
        if (!isEmptyMessage(props.children as React.ReactNode)) {
          hasErrorContent = true;
        }
        return;
      }
      if (child.type === FormFieldDescription) {
        if (!isEmptyMessage(props.children as React.ReactNode)) {
          hasDescriptionRaw = true;
        }
        return;
      }
      // No es un slot de mensaje: sigue buscando dentro de sus propios
      // hijos (soporta wrappers arbitrarios: <div>, Fragment, iconos, etc.).
      walk(props.children as React.ReactNode);
    });
  }

  walk(children);

  return {
    hasErrorContent,
    hasDescriptionContent: hasDescriptionRaw && !hasErrorContent,
  };
}

/**
 * Compone `id`/`aria-*`/`disabled`/slot `control` en el único hijo.
 *
 * `id` es el único campo que FormField SIEMPRE gestiona (sobrescribe lo que
 * el hijo haya definido): es lo que garantiza que `<label htmlFor>` y el
 * `id` real del control en el DOM coincidan siempre — el patrón estándar en
 * Radix/MUI `FormControl`. El resto (`aria-invalid`, `aria-required`,
 * `disabled`) se compone SIN sobrescribir lo que el hijo ya definió
 * explícitamente, y `aria-describedby` se mezcla (valor del hijo + ids
 * generados), nunca se reemplaza.
 */
function composeControlProps(
  child: React.ReactElement,
  ctx: FormFieldContextValue,
  mergedRef: React.RefCallback<unknown>,
): React.ReactElement {
  const childElement = child as React.ReactElement<UnknownProps>;
  const childProps = childElement.props;

  const generatedDescribedBy = [
    ctx.hasDescription ? ctx.descriptionId : null,
    ctx.hasError ? ctx.errorId : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  const existingDescribedBy = childProps["aria-describedby"];
  const composedDescribedBy = [
    typeof existingDescribedBy === "string" && existingDescribedBy.length > 0
      ? existingDescribedBy
      : null,
    generatedDescribedBy.length > 0 ? generatedDescribedBy : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  const nextProps: UnknownProps = {
    // FormField es dueño del id del control (ver comentario de la función).
    id: ctx.id,
    ref: mergedRef,
  };

  if (composedDescribedBy.length > 0) {
    nextProps["aria-describedby"] = composedDescribedBy;
  }
  if (ctx.invalid && childProps["aria-invalid"] === undefined) {
    nextProps["aria-invalid"] = true;
  }
  if (ctx.required && childProps["aria-required"] === undefined) {
    nextProps["aria-required"] = true;
  }
  if (childProps.disabled === undefined && ctx.disabled) {
    nextProps.disabled = true;
  }

  const controlClassName = cn(
    childProps.className as string | undefined,
    ctx.classNames?.control,
  );
  if (controlClassName) {
    nextProps.className = controlClassName;
  }
  if (ctx.styles?.control) {
    nextProps.style = {
      ...(childProps.style as React.CSSProperties | undefined),
      ...ctx.styles.control,
    };
  }

  return React.cloneElement(childElement, nextProps);
}

const rootBaseClassName = "grid gap-1.5";
const labelBaseClassName = "text-sm font-medium text-ui-foreground";
const requiredIndicatorBaseClassName = "ml-1 text-ui-danger";
const optionalIndicatorBaseClassName =
  "ml-1 text-xs font-normal text-ui-foreground/60";
const descriptionBaseClassName = "text-sm text-ui-foreground/60";
const errorBaseClassName = "text-sm text-ui-danger";
const reservedSpaceClassName = "min-h-5 text-sm";

/**
 * Raíz de la API compuesta: genera ids estables, calcula el estado
 * derivado (inválido/descripción activa/error activo) recorriendo todo su
 * subárbol de hijos (no solo los directos) y lo expone vía contexto.
 * Consulta `components_docs/migration/03_form_field.md` para el contrato
 * completo.
 */
export const FormFieldRoot = React.forwardRef<HTMLDivElement, FormFieldRootProps>(
  (
    {
      id,
      required = false,
      optional = false,
      invalid = false,
      disabled = false,
      reserveMessageSpace = false,
      className,
      classNames,
      unstyled = false,
      style,
      styles,
      children,
      ...rest
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const descriptionId = `${fieldId}-description`;
    const errorId = `${fieldId}-error`;

    const { hasErrorContent, hasDescriptionContent } =
      scanMessageContent(children);
    const effectiveInvalid = invalid || hasErrorContent;

    const contextValue = React.useMemo<FormFieldContextValue>(
      () => ({
        id: fieldId,
        descriptionId,
        errorId,
        invalid: effectiveInvalid,
        required,
        optional,
        disabled,
        hasDescription: hasDescriptionContent,
        hasError: hasErrorContent,
        unstyled,
        classNames,
        styles,
      }),
      [
        fieldId,
        descriptionId,
        errorId,
        effectiveInvalid,
        required,
        optional,
        disabled,
        hasDescriptionContent,
        hasErrorContent,
        unstyled,
        classNames,
        styles,
      ],
    );

    const showReservedPlaceholder =
      reserveMessageSpace && !hasDescriptionContent && !hasErrorContent;

    return (
      <FormFieldContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(!unstyled && rootBaseClassName, className, classNames?.root)}
          style={{ ...styles?.root, ...style }}
          data-invalid={effectiveInvalid || undefined}
          data-disabled={disabled || undefined}
          data-required={required || undefined}
          data-optional={optional || undefined}
          {...rest}
        >
          {children}
          {showReservedPlaceholder ? (
            <p
              aria-hidden="true"
              className={cn(!unstyled && reservedSpaceClassName)}
            />
          ) : null}
        </div>
      </FormFieldContext.Provider>
    );
  },
);
FormFieldRoot.displayName = "FormField.Root";

export const FormFieldLabel = React.forwardRef<
  HTMLLabelElement,
  FormFieldLabelProps
>(({ className, style, children, ...rest }, ref) => {
  const ctx = useFormFieldContextOrThrow("FormField.Label");
  return (
    <label
      ref={ref}
      htmlFor={ctx.id}
      className={cn(!ctx.unstyled && labelBaseClassName, className, ctx.classNames?.label)}
      style={{ ...ctx.styles?.label, ...style }}
      data-disabled={ctx.disabled || undefined}
      {...rest}
    >
      {children}
      {ctx.required ? (
        <span
          className={cn(
            !ctx.unstyled && requiredIndicatorBaseClassName,
            ctx.classNames?.requiredIndicator,
          )}
          style={ctx.styles?.requiredIndicator}
        >
          <span aria-hidden="true">*</span>
          <span className="sr-only"> (requerido)</span>
        </span>
      ) : null}
      {ctx.optional && !ctx.required ? (
        <span
          className={cn(
            !ctx.unstyled && optionalIndicatorBaseClassName,
            ctx.classNames?.optionalIndicator,
          )}
          style={ctx.styles?.optionalIndicator}
        >
          (opcional)
        </span>
      ) : null}
    </label>
  );
});
FormFieldLabel.displayName = "FormField.Label";

/**
 * Envuelve al único control hijo componiendo `id`/`aria-*`/`disabled` y el
 * slot `control`. `id` siempre lo gestiona FormField (sobrescribe el del
 * hijo); `aria-invalid`/`aria-required`/`disabled` respetan lo que el hijo
 * ya definió explícitamente, y `aria-describedby` se mezcla.
 */
export function FormFieldControl({
  children,
}: FormFieldControlProps): React.ReactElement {
  const ctx = useFormFieldContextOrThrow("FormField.Control");
  const internalRef = React.useRef<HTMLElement | null>(null);

  const childElement = children as React.ReactElement<UnknownProps>;
  const childRef = childElement.props.ref as React.Ref<unknown> | undefined;

  // Identidad estable entre renders: evita que React desmonte/reasigne el
  // ref del control en cada render (mergeRefs(...) inline generaría una
  // función nueva cada vez).
  const mergedRef = React.useMemo(
    () => mergeRefs(childRef, internalRef),
    [childRef, ctx.id],
  );

  React.useEffect(() => {
    if (
      typeof process === "undefined" ||
      process.env.NODE_ENV === "production"
    ) {
      return;
    }
    const node = internalRef.current;
    // `id` es siempre gestionado por FormField (ver `composeControlProps`),
    // así que un desajuste aquí solo puede significar que el componente
    // hijo no reenvió la prop `id` al elemento real del DOM — la asociación
    // con <label htmlFor> se rompe silenciosamente en ese caso.
    // `aria-describedby` no depende de esto: se deriva de `ctx.id`
    // independientemente de lo que el nodo del DOM termine mostrando.
    if (node && node.id !== ctx.id) {
      console.warn(
        `[FormField] El control no aplicó el id "${ctx.id}" que FormField le asignó ` +
          `(el nodo del DOM tiene "${node.id}"). FormField gestiona el id del control ` +
          "(sobrescribe cualquier id que el hijo defina) para garantizar la asociación " +
          "con <label for>; revisa que el componente hijo reenvíe la prop `id` recibida " +
          "al elemento real del DOM.",
      );
    }
  }, [ctx.id]);

  return composeControlProps(children, ctx, mergedRef);
}
FormFieldControl.displayName = "FormField.Control";

export const FormFieldDescription = React.forwardRef<
  HTMLParagraphElement,
  FormFieldDescriptionProps
>(({ className, style, children, ...rest }, ref) => {
  const ctx = useFormFieldContextOrThrow("FormField.Description");
  // El error reemplaza visualmente a la descripción: si hay error activo,
  // no se renderiza (evita anunciar dos mensajes simultáneos).
  if (isEmptyMessage(children) || ctx.hasError) {
    return null;
  }
  return (
    <p
      ref={ref}
      id={ctx.descriptionId}
      className={cn(
        !ctx.unstyled && descriptionBaseClassName,
        className,
        ctx.classNames?.description,
      )}
      style={{ ...ctx.styles?.description, ...style }}
      {...rest}
    >
      {children}
    </p>
  );
});
FormFieldDescription.displayName = "FormField.Description";

export const FormFieldError = React.forwardRef<
  HTMLParagraphElement,
  FormFieldErrorProps
>(({ className, style, children, ...rest }, ref) => {
  const ctx = useFormFieldContextOrThrow("FormField.Error");
  if (isEmptyMessage(children)) {
    return null;
  }
  return (
    <p
      ref={ref}
      id={ctx.errorId}
      className={cn(
        !ctx.unstyled && errorBaseClassName,
        className,
        ctx.classNames?.error,
      )}
      style={{ ...ctx.styles?.error, ...style }}
      {...rest}
    >
      {children}
    </p>
  );
});
FormFieldError.displayName = "FormField.Error";

/**
 * API de conveniencia: envuelve la API compuesta (`Root`/`Label`/`Control`/
 * `Description`/`Error`) para que ambas compartan exactamente la misma
 * lógica de ids y ARIA. Consulta `components_docs/migration/03_form_field.md`.
 */
export function FormField({
  id,
  label,
  description,
  errorMessage,
  required = false,
  optional = false,
  invalid = false,
  disabled = false,
  reserveMessageSpace = false,
  children,
  className,
  classNames,
  unstyled = false,
  style,
  styles,
}: FormFieldProps): React.ReactElement {
  return (
    <FormFieldRoot
      id={id}
      required={required}
      optional={optional}
      invalid={invalid}
      disabled={disabled}
      reserveMessageSpace={reserveMessageSpace}
      className={className}
      classNames={classNames}
      unstyled={unstyled}
      style={style}
      styles={styles}
    >
      {label !== undefined && label !== null ? (
        <FormFieldLabel>{label}</FormFieldLabel>
      ) : null}
      <FormFieldControl>{children}</FormFieldControl>
      <FormFieldDescription>{description}</FormFieldDescription>
      <FormFieldError>{errorMessage}</FormFieldError>
    </FormFieldRoot>
  );
}

FormField.Root = FormFieldRoot;
FormField.Label = FormFieldLabel;
FormField.Control = FormFieldControl;
FormField.Description = FormFieldDescription;
FormField.Error = FormFieldError;
FormField.displayName = "FormField";
