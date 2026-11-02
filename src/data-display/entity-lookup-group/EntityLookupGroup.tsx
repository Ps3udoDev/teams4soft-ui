import * as React from "react";
import { FormField } from "../../forms/form-field/FormField";
import { TextField } from "../../forms/text-field/TextField";
import { cn } from "../../lib";
import { FormGrid } from "../../layout/form-grid/FormGrid";
import { Button } from "../../primitives";
import { LookupInput } from "../entity-lookup-field/LookupInput";
import { LookupDialog } from "../lookup-core/LookupDialog";
import { entityLookupMessagesEs, type EntityLookupMessages } from "../lookup-core/lookup-core.types";
import { isEmptyQuery } from "../lookup-core/lookup-utils";
import { useLookupController, type LookupOutcome } from "../lookup-core/use-lookup-controller";
import { useLookupNotices } from "../lookup-core/use-lookup-notices";
import type { EntityLookupGroupProps, NormalizedField } from "./EntityLookupGroup.types";
import { applySelection, buildDefaultParams, buildDefaultSearchLabel, normalizeFields } from "./lookup-group-utils";

// Tailwind only sees literal class names, so every position is enumerated.
const colStart = { 1: "md:col-start-1", 2: "md:col-start-2", 3: "md:col-start-3", 4: "md:col-start-4" } as const;
const rowStart = { 1: "md:row-start-1", 2: "md:row-start-2", 3: "md:row-start-3", 4: "md:row-start-4" } as const;
const colSpan = { 1: "md:col-span-1", 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4" } as const;

const read = (values: Record<string, string>, key: string) => (values[key] ?? "").trim();

export function EntityLookupGroup<T>(props: EntityLookupGroupProps<T>) {
  const {
    values, getItemId, columns, search, pageSize = 50, gridColumns = 2, onSearchError,
    onCreateRequest, notFoundMessage, classNames, styles, unstyled,
  } = props;

  const latest = React.useRef(props);
  latest.current = props;
  // Searches read the values at the moment they run, never the ones a closure captured.
  const valuesRef = React.useRef(values);
  valuesRef.current = values;

  const messages = React.useMemo<EntityLookupMessages>(
    () => ({ ...entityLookupMessagesEs, ...props.messages }),
    [props.messages],
  );

  const normalized = React.useMemo(() => normalizeFields(props.fields), [props.fields]);
  const normalizedRef = React.useRef(normalized);
  normalizedRef.current = normalized;
  const primary = normalized.find((field) => field.primary);

  const controller = useLookupController<T, Record<string, string>>({
    search,
    pageSize,
    autoSelectSingle: true,
    onSearchError,
  });
  const { state, close: closeController } = controller;
  const { noticesElement, showNotFound, showQueryRequired } = useLookupNotices({ messages, notFoundMessage, onCreateRequest });

  const [open, setOpen] = React.useState(false);
  const [dialogPageSize, setDialogPageSize] = React.useState(pageSize);
  const inputsRef = React.useRef(new Map<string, HTMLInputElement>());
  // `null`: the trigger button started the search.
  const originRef = React.useRef<string | null>(null);

  const buildQuery = (term: string) =>
    (latest.current.buildParams ?? buildDefaultParams)({
      fields: normalizedRef.current,
      values: valuesRef.current,
      term,
      searchParam: latest.current.searchParam ?? "search",
    });

  const searchLabel = (term: string) =>
    (latest.current.getSearchLabel ?? buildDefaultSearchLabel)({ fields: normalizedRef.current, values: valuesRef.current, term }) || term;

  const firstFilledTerm = () => {
    const first = normalizedRef.current.find((field) => field.searchable && read(valuesRef.current, field.key));
    return first ? read(valuesRef.current, first.key) : "";
  };

  const pick = (item: T) => {
    const next = applySelection(normalizedRef.current, valuesRef.current, item);
    latest.current.onValuesChange(next);
    latest.current.onSelectionChange?.(item);
  };

  const focusOrigin = () => {
    const key = originRef.current ?? normalizedRef.current.find((field) => field.primary)?.key;
    if (key !== undefined) inputsRef.current.get(key)?.focus();
  };

  const openDialog = () => {
    // The dialog restores focus to whatever was active when it opened.
    focusOrigin();
    setDialogPageSize(latest.current.pageSize ?? 50);
    setOpen(true);
  };

  const closeDialog = () => setOpen(false);

  const wasOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (wasOpenRef.current && !open) closeController();
    wasOpenRef.current = open;
  }, [open, closeController]);

  const settle = async (outcome: LookupOutcome<T, Record<string, string>>, term: string) => {
    switch (outcome.type) {
      case "selected":
        pick(outcome.item);
        break;
      case "choose":
        openDialog();
        break;
      case "notFound":
        // Accepting the plain notice leaves the fields alone: the group is controlled and clearing several captured fields would discard input.
        await showNotFound(searchLabel(term), outcome.emptyMessage);
        break;
      case "queryRequired":
        await showQueryRequired();
        break;
      default:
        break;
    }
  };

  const runLookup = async (term: string, intent: "commit" | "browse" | "auto", origin: string | null) => {
    originRef.current = origin;
    const query = buildQuery(term);
    const resolved = intent === "auto" ? (isEmptyQuery(query) ? "browse" : "commit") : intent;
    const outcome = await controller.runSearch(query, { intent: resolved });
    await settle(outcome, term);
  };

  const onKeyDown = (field: NormalizedField) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!field.searchable || field.disabled) return;
    const text = read(valuesRef.current, field.key);
    if (text) void runLookup(text, "commit", field.key);
  };

  const onTextChange = (field: NormalizedField, text: string) => {
    latest.current.onValuesChange({ ...valuesRef.current, [field.key]: text }, field.key);
  };

  const onTrigger = () => {
    if (primary?.disabled) return;
    void runLookup(firstFilledTerm(), "auto", null);
  };

  const renderFooter = () => {
    if (onCreateRequest) {
      return (
        <Button variant="outline" onClick={() => { closeDialog(); onCreateRequest(searchLabel(firstFilledTerm())); }}>
          {messages.create}
        </Button>
      );
    }
    return <Button variant="outline" onClick={closeDialog}>{messages.cancel}</Button>;
  };

  const busy = state.status === "searching";
  const dataAttributes = Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith("data-"))) as Record<string, string>;

  return (
    <div
      id={props.id}
      data-slot="root"
      className={cn(classNames?.root, props.className)}
      style={{ ...styles?.root, ...props.style }}
      {...dataAttributes}
    >
      <FormGrid
        data-slot="grid"
        columns={{ base: 1, md: gridColumns }}
        gap="md"
        align="start"
        unstyled={unstyled}
        className={classNames?.grid}
        style={styles?.grid}
      >
        {normalized.map((field) => (
          <FormGrid.Item
            key={field.key}
            data-slot="field"
            unstyled={unstyled}
            className={cn(
              !unstyled && field.col && colStart[field.col],
              !unstyled && field.row && rowStart[field.row],
              !unstyled && field.colSpan && colSpan[field.colSpan],
              classNames?.field,
            )}
            style={styles?.field}
          >
            <FormField.Root required={field.required} disabled={field.disabled} unstyled={unstyled}>
              {field.label !== undefined && field.label !== null ? <FormField.Label>{field.label}</FormField.Label> : null}
              <FormField.Control>
                {field.primary ? (
                  <LookupInput
                    ref={(element) => { if (element) inputsRef.current.set(field.key, element); else inputsRef.current.delete(field.key); }}
                    placeholder={field.placeholder}
                    type={field.type}
                    value={values[field.key] ?? ""}
                    onValueChange={(text) => onTextChange(field, text)}
                    onKeyDown={onKeyDown(field)}
                    disabled={field.disabled}
                    inert={Boolean(field.disabled)}
                    clearable={field.clearable}
                    clearLabel={messages.clear}
                    busy={busy}
                    triggerLabel={messages.trigger}
                    onTrigger={onTrigger}
                    unstyled={unstyled}
                    classNames={{ trigger: classNames?.trigger }}
                    styles={{ trigger: styles?.trigger }}
                  />
                ) : (
                  <TextField
                    ref={(element) => { if (element) inputsRef.current.set(field.key, element); else inputsRef.current.delete(field.key); }}
                    placeholder={field.placeholder}
                    type={field.type}
                    value={values[field.key] ?? ""}
                    onValueChange={(text) => onTextChange(field, text)}
                    onKeyDown={onKeyDown(field)}
                    disabled={field.disabled}
                    clearable={field.clearable}
                    clearLabel={messages.clear}
                    autoComplete="off"
                    unstyled={unstyled}
                  />
                )}
              </FormField.Control>
              <FormField.Description>{field.description}</FormField.Description>
              <FormField.Error>{field.errorMessage}</FormField.Error>
            </FormField.Root>
          </FormGrid.Item>
        ))}
      </FormGrid>
      <LookupDialog<T>
        open={open}
        onOpenChange={(next) => { if (!next) closeDialog(); }}
        title={props.dialogTitle}
        size={props.dialogSize}
        tableMaxHeight={props.tableMaxHeight}
        columns={columns}
        initialSort={props.initialSort}
        rows={state.rows}
        total={state.total}
        page={state.page}
        pageSize={dialogPageSize}
        loading={busy}
        remote={state.total !== null}
        getItemId={(item) => String(getItemId(item))}
        onConfirm={(item) => { pick(item); closeDialog(); }}
        onPageChange={(page, size) => { setDialogPageSize(size); void controller.goToPage(page, size); }}
        messages={messages}
        classNames={{ content: classNames?.dialog }}
        footerExtra={renderFooter}
      />
      {noticesElement}
    </div>
  );
}
