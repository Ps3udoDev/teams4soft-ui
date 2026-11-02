import * as React from "react";
import { cn, mergeRefs, useClientLayoutEffect } from "../../lib";
import { TextField } from "../text-field/TextField";
import type { NumberFieldProps } from "./NumberField.types";
import {
  formatNumber,
  formatWhileTyping,
  parseNumber,
  sanitizePaste,
  type NumberFormatOptions,
} from "./number-utils";

const NOT_COMMITTED = Symbol("not-committed");

/**
 * Campo numérico con miles mientras se escribe. El valor público es
 * `number | null`; el texto es estado interno.
 */
export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      onCommit,
      mode = "decimal",
      fractionDigits,
      minFractionDigits,
      maxFractionDigits,
      currencySymbol,
      allowNegative = false,
      min,
      max,
      locale,
      selectOnFocus = true,
      invalid = false,
      unstyled = false,
      classNames,
      onFocus,
      onBlur,
      onKeyDown,
      onPaste,
      ...rest
    },
    ref,
  ) => {
    const opts = React.useMemo<NumberFormatOptions>(
      () => ({
        mode,
        minFractionDigits: fractionDigits ?? minFractionDigits,
        maxFractionDigits: fractionDigits ?? maxFractionDigits,
        currencySymbol,
        allowNegative,
        locale,
      }),
      [mode, fractionDigits, minFractionDigits, maxFractionDigits, currencySymbol, allowNegative, locale],
    );

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = React.useMemo(() => mergeRefs(ref, inputRef), [ref]);

    /** Texto de edición: sin prefijo ni sufijo, conserva comas y ceros. */
    const stripAffixes = React.useCallback(
      (text: string): string => {
        let result = text;
        const symbol = opts.currencySymbol ?? "$";
        if (opts.mode === "currency" && symbol) result = result.split(symbol).join("");
        if (opts.mode === "percent") result = result.split("%").join("");
        return result.trim();
      },
      [opts],
    );

    const [text, setText] = React.useState(() =>
      formatNumber(value ?? defaultValue ?? null, opts),
    );
    // Fuerza un render aunque el texto formateado coincida con el previo (React restaura el DOM y mueve el caret al final).
    const [caretTick, setCaretTick] = React.useState(0);
    const textRef = React.useRef(text);
    textRef.current = text;
    // Tras confirmar, el padre puede dejar `value` igual que antes (recortó al mismo número): se concilia igualmente.
    const [commitCheck, setCommitCheck] = React.useState(0);

    const focusedRef = React.useRef(false);
    /** Último número válido o externo: el texto puede estar a medias o no poder representarlo. */
    const numberRef = React.useRef<number | null>(value ?? defaultValue ?? null);
    const lastCommitRef = React.useRef<number | null | typeof NOT_COMMITTED>(NOT_COMMITTED);
    const pendingSelectionRef = React.useRef<{ start: number; end: number } | null>(null);

    const readNumber = (source: string): number | null => {
      const parsed = parseNumber(source, opts);
      return parsed.ok ? parsed.value : null;
    };

    // Anti-eco: un `value` externo solo reescribe el texto si su número difiere del del texto actual.
    React.useEffect(() => {
      if (value === undefined) return;
      const external = value ?? null;
      numberRef.current = external;
      // Un valor que no es el eco de lo confirmado reabre la confirmación: repetir el número sí debe avisar.
      if (lastCommitRef.current !== external) lastCommitRef.current = NOT_COMMITTED;
      if (readNumber(textRef.current) === external) return;
      const display = formatNumber(external, opts);
      setText(focusedRef.current ? stripAffixes(display) : display);
    }, [value, commitCheck]);

    // Con foco el texto es el que se está escribiendo; al salir ya se formatea con las opciones nuevas.
    React.useEffect(() => {
      if (!focusedRef.current) setText(formatNumber(numberRef.current, opts));
    }, [opts]);

    useClientLayoutEffect(() => {
      const pending = pendingSelectionRef.current;
      if (!pending) return;
      pendingSelectionRef.current = null;
      const node = inputRef.current;
      if (!node || document.activeElement !== node) return;
      try {
        node.setSelectionRange(pending.start, pending.end);
      } catch {
        // Selección no soportada: se ignora.
      }
    }, [text, caretTick]);

    const applyRaw = (raw: string, caret: number) => {
      const next = formatWhileTyping(raw, caret, opts);
      pendingSelectionRef.current = { start: next.caret, end: next.caret };
      setText(next.text);
      setCaretTick((tick) => tick + 1);
      const parsed = parseNumber(next.text, opts);
      if (parsed.ok && parsed.value !== numberRef.current) {
        numberRef.current = parsed.value;
        onValueChange?.(parsed.value);
      }
    };

    const handleValueChange = (raw: string) => {
      const node = inputRef.current;
      applyRaw(raw, node?.selectionStart ?? raw.length);
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(event);
      if (event.defaultPrevented) return;
      const node = event.currentTarget;
      event.preventDefault();
      const pasted = sanitizePaste(event.clipboardData.getData("text"), opts);
      const start = node.selectionStart ?? node.value.length;
      const end = node.selectionEnd ?? start;
      applyRaw(node.value.slice(0, start) + pasted + node.value.slice(end), start + pasted.length);
    };

    const commit = () => {
      const current = numberRef.current;
      if (lastCommitRef.current === current) return;
      lastCommitRef.current = current;
      onCommit?.(current);
      setCommitCheck((check) => check + 1);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(event);
      focusedRef.current = true;
      lastCommitRef.current = NOT_COMMITTED;
      const node = event.currentTarget;
      const stripped = stripAffixes(textRef.current);
      if (stripped !== textRef.current) {
        if (selectOnFocus) pendingSelectionRef.current = { start: 0, end: stripped.length };
        setText(stripped);
      } else if (selectOnFocus) {
        node.select();
      }
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(event);
      focusedRef.current = false;
      setText(formatNumber(numberRef.current, opts));
      commit();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === "Enter") commit();
    };

    const current = readNumber(text);
    const outOfRange =
      current !== null && ((min !== undefined && current < min) || (max !== undefined && current > max));

    return (
      <TextField
        {...rest}
        ref={mergedRef}
        type="text"
        inputMode={mode === "integer" ? "numeric" : "decimal"}
        value={text}
        onValueChange={handleValueChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        invalid={invalid || outOfRange}
        unstyled={unstyled}
        classNames={{
          ...classNames,
          input: cn(!unstyled && "text-right tabular-nums", classNames?.input),
        }}
      />
    );
  },
);

NumberField.displayName = "NumberField";
