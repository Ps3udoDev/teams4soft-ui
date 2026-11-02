import * as React from "react";
import { FormField } from "../../forms/form-field/FormField";
import { cn, mergeRefs } from "../../lib";
import { LookupDialog } from "../lookup-core/LookupDialog";
import { entityLookupMessagesEs, type EntityLookupMessages } from "../lookup-core/lookup-core.types";
import { filterLocalItems } from "../lookup-core/lookup-utils";
import { useLookupController, type LookupOutcome } from "../lookup-core/use-lookup-controller";
import { useLookupNotices } from "../lookup-core/use-lookup-notices";
import type { EntityLookupFieldProps } from "./EntityLookupField.types";
import { LookupInput } from "./LookupInput";

const hintClassName = "text-sm text-ui-success";

export function EntityLookupField<T>(props: EntityLookupFieldProps<T>) {
  const {
    selectedItem, getItemId, getItemLabel, columns, items, search, pageSize = 50, autoSelectSingle = true, onSearchError,
    onCreateRequest, notFoundMessage, criteria, criterion, defaultCriterion, disabled = false, readOnly = false,
    onTriggerClick, classNames, styles, unstyled, inputRef,
  } = props;

  const latest = React.useRef(props);
  latest.current = props;

  const messages = React.useMemo<EntityLookupMessages>(
    () => ({ ...entityLookupMessagesEs, ...props.messages }),
    [props.messages],
  );

  const labelOf = (item: T) => getItemLabel(item);
  const selectedId = selectedItem ? String(getItemId(selectedItem)) : null;
  const selectedLabel = selectedItem ? labelOf(selectedItem) : null;

  const [innerText, setInnerText] = React.useState(() => props.defaultInputValue ?? selectedLabel ?? "");
  const text = props.inputValue ?? innerText;
  const textRef = React.useRef(text);
  textRef.current = text;

  const setText = (next: string) => {
    textRef.current = next;
    if (latest.current.inputValue === undefined) setInnerText(next);
    latest.current.onInputValueChange?.(next);
  };

  const [innerOpen, setInnerOpen] = React.useState(props.defaultOpen ?? false);
  const open = props.open ?? innerOpen;
  const openRef = React.useRef(open);
  openRef.current = open;
  const [preselectedId, setPreselectedId] = React.useState<string | null>(null);
  const [dialogPageSize, setDialogPageSize] = React.useState(pageSize);
  const ownsOpenRef = React.useRef(false);
  const inputElRef = React.useRef<HTMLInputElement | null>(null);
  const mergedInputRef = React.useMemo(() => mergeRefs(inputRef, inputElRef), [inputRef]);

  const setOpen = (next: boolean) => {
    if (latest.current.open === undefined) setInnerOpen(next);
    latest.current.onOpenChange?.(next);
  };

  const searchKeys = props.searchKeys ?? columns.map((column) => column.field);
  const controller = useLookupController<T, string>({
    search,
    items,
    localMatch: (query) => filterLocalItems(latest.current.items ?? [], query, searchKeys),
    pageSize,
    autoSelectSingle,
    onSearchError,
  });
  const { state, close: closeController } = controller;
  const { noticesElement, showNotFound, showQueryRequired } = useLookupNotices({ messages, notFoundMessage, onCreateRequest });

  const activeCriterion = criterion ?? defaultCriterion ?? criteria?.[0]?.value;

  const applySelection = (item: T) => {
    setText(latest.current.getItemLabel(item));
    latest.current.onSelectionChange(item);
  };

  const closeDialog = () => {
    ownsOpenRef.current = false;
    setOpen(false);
  };

  const openDialog = (preselect: string | null) => {
    // The dialog restores focus to whatever was active when it opened; that must be the input, also after Tab.
    inputElRef.current?.focus();
    ownsOpenRef.current = true;
    setPreselectedId(preselect);
    setDialogPageSize(latest.current.pageSize ?? 50);
    if (!openRef.current) setOpen(true);
  };

  const settle = async (outcome: LookupOutcome<T, string>, preselect: string | null) => {
    switch (outcome.type) {
      case "selected":
        applySelection(outcome.item);
        break;
      case "choose":
        openDialog(preselect);
        break;
      case "notFound": {
        const result = await showNotFound(outcome.query, outcome.emptyMessage);
        if (result === "dismissed") {
          setText("");
          if (latest.current.selectedItem) latest.current.onSelectionChange(null);
        }
        break;
      }
      case "queryRequired":
        await showQueryRequired();
        break;
      default:
        break;
    }
  };

  const runLookup = async (query: string, intent: "commit" | "browse", preselect: string | null = null) => {
    const outcome = await controller.runSearch(query, { intent, criterion: activeCriterion });
    await settle(outcome, preselect);
    return outcome;
  };

  const runTrigger = () => {
    const query = textRef.current.trim();
    const current = latest.current.selectedItem;
    if (current && textRef.current === latest.current.getItemLabel(current)) {
      return runLookup("", "browse", String(latest.current.getItemId(current)));
    }
    return query ? runLookup(query, "commit") : runLookup("", "browse");
  };

  // A parent that opens the dialog itself (`open`, `defaultOpen`) gets the same listing as the trigger button.
  React.useEffect(() => {
    if (!open || ownsOpenRef.current) return;
    ownsOpenRef.current = true;
    void runTrigger().then((outcome) => {
      if (outcome.type !== "choose") closeDialog();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const wasOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      ownsOpenRef.current = false;
      setPreselectedId(null);
      closeController();
    }
    wasOpenRef.current = open;
  }, [open, closeController]);

  // Re-syncs only when the selected id changes, so a re-render with a fresh object of the same record never touches typed text.
  const previousRef = React.useRef({ id: selectedId, label: selectedLabel ?? "" });
  React.useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { id: selectedId, label: selectedLabel ?? "" };
    if (previous.id === selectedId) return;
    const current = textRef.current;
    if (current !== previous.label && current !== "") return;
    if (current !== (selectedLabel ?? "")) setText(selectedLabel ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const inert = disabled || readOnly;
  const isDirtyText = () => {
    const current = latest.current.selectedItem;
    const value = textRef.current;
    return value.trim() !== "" && (!current || value !== latest.current.getItemLabel(current));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      if (inert) return;
      if (onTriggerClick) onTriggerClick();
      else if (textRef.current.trim() !== "") void runLookup(textRef.current.trim(), "commit");
    } else if (event.key === "Tab" && !inert && !onTriggerClick && isDirtyText()) {
      void runLookup(textRef.current.trim(), "commit");
    }
  };

  const onTextChange = (next: string) => {
    setText(next);
    if (next === "" && latest.current.selectedItem) latest.current.onSelectionChange(null);
  };

  const onTrigger = () => {
    if (inert) return;
    if (onTriggerClick) onTriggerClick();
    else void runTrigger();
  };

  const busy = Boolean(props.loading) || state.status === "searching";
  const resolved = selectedLabel !== null && text === selectedLabel;
  const fieldState = text === "" && !selectedItem ? "idle" : resolved ? "resolved" : "dirty";

  const dataAttributes = Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith("data-"))) as Record<string, string>;

  return (
    <>
      <FormField.Root
        id={props.id}
        required={props.required}
        optional={props.optional}
        invalid={props.invalid}
        disabled={disabled}
        reserveMessageSpace={props.reserveMessageSpace}
        orientation={props.orientation}
        labelWidth={props.labelWidth}
        requiredIndicator={props.requiredIndicator}
        className={props.className}
        classNames={{ root: classNames?.root, control: classNames?.control }}
        unstyled={unstyled}
        style={props.style}
        styles={{ root: styles?.root, control: styles?.control }}
        {...dataAttributes}
        data-state={fieldState}
        data-loading={busy || undefined}
      >
        {props.label !== undefined && props.label !== null ? <FormField.Label>{props.label}</FormField.Label> : null}
        <FormField.Control>
          <LookupInput
            ref={mergedInputRef}
            name={props.name}
            placeholder={props.placeholder}
            value={text}
            onValueChange={onTextChange}
            onKeyDown={onKeyDown}
            inert={inert}
            readOnly={readOnly}
            clearable={props.clearable}
            busy={busy}
            triggerLabel={messages.trigger}
            triggerIcon={props.triggerIcon}
            onTrigger={onTrigger}
            trailingActions={props.trailingActions}
            unstyled={unstyled}
            classNames={classNames}
            styles={styles}
          />
        </FormField.Control>
        {props.showSelectedHint && resolved ? (
          <p className={cn(!unstyled && hintClassName, classNames?.hint)} style={styles?.hint} data-slot="hint">
            <span aria-hidden="true">✓ </span>
            {messages.selectedHint}
          </p>
        ) : null}
        <FormField.Description>{props.description}</FormField.Description>
        <FormField.Error>{props.errorMessage}</FormField.Error>
      </FormField.Root>
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
        loading={state.status === "searching"}
        remote={state.total !== null}
        getItemId={(item) => String(getItemId(item))}
        preselectedId={preselectedId}
        onConfirm={(item) => { applySelection(item); closeDialog(); }}
        onPageChange={(page, size) => { setDialogPageSize(size); void controller.goToPage(page, size); }}
        messages={messages}
        classNames={{ content: classNames?.dialog }}
      />
      {noticesElement}
    </>
  );
}
