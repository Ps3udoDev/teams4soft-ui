import * as React from "react";
import { FormField } from "../../forms/form-field/FormField";
import { cn, mergeRefs } from "../../lib";
import { Button } from "../../primitives";
import { LookupDialog } from "../lookup-core/LookupDialog";
import { entityLookupMessagesEs, type EntityLookupMessages } from "../lookup-core/lookup-core.types";
import { filterLocalItems, matchLocalItems } from "../lookup-core/lookup-utils";
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
  // Blur matches (exact first) differ from the Enter filter; the next local search shows exactly these rows.
  const forcedRowsRef = React.useRef<T[] | null>(null);
  const controller = useLookupController<T, string>({
    search,
    items,
    localMatch: (query) => {
      const forced = forcedRowsRef.current;
      forcedRowsRef.current = null;
      return forced ?? filterLocalItems(latest.current.items ?? [], query, searchKeys);
    },
    pageSize,
    autoSelectSingle,
    onSearchError,
  });
  const { state, close: closeController } = controller;
  const { noticesElement, showNotFound, showQueryRequired } = useLookupNotices({ messages, notFoundMessage, onCreateRequest });

  const noticeOpenRef = React.useRef(false);
  noticeOpenRef.current = noticesElement !== null;
  const menuOpenRef = React.useRef(false);
  // Typed or pasted since the last selection or search; text that came from outside never sets it.
  const dirtyRef = React.useRef(false);
  const dialogCancelledRef = React.useRef(false);

  const restoreSelectionLabel = () => {
    const current = latest.current.selectedItem;
    setText(current ? latest.current.getItemLabel(current) : "");
  };

  const [innerCriterion, setInnerCriterion] = React.useState(() => defaultCriterion ?? criteria?.[0]?.value);
  const activeCriterion = criterion ?? innerCriterion;

  const applySelection = (item: T) => {
    dirtyRef.current = false;
    setText(latest.current.getItemLabel(item));
    latest.current.onSelectionChange(item);
  };

  const closeDialog = () => {
    ownsOpenRef.current = false;
    setOpen(false);
  };

  // Kept (closed) after the first open so the form can finish its exit; reset whenever the search dialog closes.
  const [form, setForm] = React.useState<{ mode: "create" | "view"; item: T | null; open: boolean } | null>(null);
  const openForm = (mode: "create" | "view", item: T | null) => setForm({ mode, item, open: true });
  const closeForm = () => setForm((current) => (current ? { ...current, open: false } : null));
  const onFormSaved = (item: T) => {
    applySelection(item);
    setForm(null);
    closeDialog();
    inputElRef.current?.focus();
  };

  const renderFooter = ({ selectedItem: rowItem }: { selectedItem: T | null }) => {
    const { renderEntityForm, onCreateRequest: createRequest } = latest.current;
    const cancel = <Button variant="outline" onClick={closeDialog}>{messages.cancel}</Button>;
    if (renderEntityForm) {
      const target = rowItem ?? latest.current.selectedItem;
      return (
        <>
          {cancel}
          {target
            ? <Button variant="outline" onClick={() => openForm("view", target)}>{messages.view}</Button>
            : <Button variant="outline" onClick={() => openForm("create", null)}>{messages.create}</Button>}
        </>
      );
    }
    if (createRequest) {
      return <Button variant="outline" onClick={() => { closeDialog(); createRequest(textRef.current); }}>{messages.create}</Button>;
    }
    return cancel;
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
        } else if (result === "kept" && latest.current.restoreCancelledText) {
          restoreSelectionLabel();
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

  // `chosen` is the criterion just picked in the menu, which a controlling parent may not have echoed back yet.
  const runLookup = async (query: string, intent: "commit" | "browse", preselect: string | null = null, chosen = activeCriterion) => {
    dirtyRef.current = false;
    dialogCancelledRef.current = false;
    const outcome = await controller.runSearch(query, { intent, criterion: chosen });
    await settle(outcome, preselect);
    return outcome;
  };

  const runTrigger = (chosen = activeCriterion) => {
    const query = textRef.current.trim();
    const current = latest.current.selectedItem;
    if (current && textRef.current === latest.current.getItemLabel(current)) {
      return runLookup("", "browse", String(latest.current.getItemId(current)), chosen);
    }
    return query ? runLookup(query, "commit", null, chosen) : runLookup("", "browse", null, chosen);
  };

  const onCriterionSelect = (value: string) => {
    if (latest.current.criterion === undefined) setInnerCriterion(value);
    latest.current.onCriterionChange?.(value);
    void runTrigger(value);
  };

  const handleBlur = (_event: React.FocusEvent<HTMLInputElement>, withinControl: boolean) => {
    if (!latest.current.resolveOnBlur || disabled || readOnly || onTriggerClick || withinControl) return;
    if (menuOpenRef.current || openRef.current || noticeOpenRef.current) return;
    const value = textRef.current.trim();
    if (!isDirtyText()) return;
    if (!dirtyRef.current) {
      // No later event would correct the text: it stays on screen while the value behind it is the old one.
      if (dialogCancelledRef.current && latest.current.restoreCancelledText) restoreSelectionLabel();
      return;
    }
    dirtyRef.current = false;

    if (latest.current.search) {
      void runLookup(value, "commit");
      return;
    }
    const matchItem = latest.current.matchItem;
    const matches = matchLocalItems(
      latest.current.items ?? [], value, searchKeys, labelOf, matchItem && ((item, text) => matchItem(text, item)),
    );
    const [only] = matches;
    if (matches.length === 1 && only !== undefined) applySelection(only);
    else if (matches.length > 1) {
      forcedRowsRef.current = matches;
      void runLookup(value, "commit");
    } else {
      setText("");
      if (latest.current.selectedItem) latest.current.onSelectionChange(null);
      latest.current.onResolveNotFound?.(value);
    }
  };

  // A parent that opens the dialog itself (`open`, `defaultOpen`) gets the same listing as the trigger button.
  React.useEffect(() => {
    if (!open || ownsOpenRef.current) return;
    ownsOpenRef.current = true;
    // An inert remote field opens with no rows: it must not hit the back end.
    if ((disabled || readOnly) && latest.current.search) return;
    void runTrigger().then((outcome) => {
      if (outcome.type !== "choose") closeDialog();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const wasOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (wasOpenRef.current && !open) {
      dialogCancelledRef.current = true;
      ownsOpenRef.current = false;
      setPreselectedId(null);
      setForm(null);
      closeController();
    }
    wasOpenRef.current = open;
  }, [open, closeController]);

  // Re-syncs when the selected id changes, or when the same record's label changes while the input still shows the old one, so typed text is never touched.
  const previousRef = React.useRef({ id: selectedId, label: selectedLabel ?? "" });
  React.useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { id: selectedId, label: selectedLabel ?? "" };
    if (previous.id === selectedId) {
      if (previous.label !== (selectedLabel ?? "") && textRef.current === previous.label) setText(selectedLabel ?? "");
      return;
    }
    // Internal transitions already left the text equal to the new label, so this only writes for outside changes.
    if (textRef.current !== (selectedLabel ?? "")) {
      dirtyRef.current = false;
      setText(selectedLabel ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedLabel]);

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
      else if (latest.current.searchOnEnter === "dirty" ? isDirtyText() : textRef.current.trim() !== "") void runLookup(textRef.current.trim(), "commit");
    } else if (event.key === "Tab" && !inert && !onTriggerClick && isDirtyText()) {
      void runLookup(textRef.current.trim(), "commit");
    }
  };

  const onTextChange = (next: string) => {
    dirtyRef.current = true;
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
            aria-label={props["aria-label"]}
            aria-describedby={props["aria-describedby"]}
            value={text}
            onValueChange={onTextChange}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            inert={inert}
            readOnly={readOnly}
            clearable={props.clearable}
            clearLabel={messages.clear}
            busy={busy}
            triggerLabel={messages.trigger}
            triggerIcon={props.triggerIcon}
            onTrigger={onTrigger}
            criteria={onTriggerClick ? undefined : criteria}
            activeCriterion={activeCriterion}
            criteriaLabel={messages.criteria}
            onCriterionSelect={onCriterionSelect}
            onCriteriaOpenChange={(next) => { menuOpenRef.current = next; }}
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
        footerExtra={renderFooter}
      />
      {form && props.renderEntityForm
        ? props.renderEntityForm({ open: form.open, onClose: closeForm, onSaved: onFormSaved, mode: form.mode, item: form.item })
        : null}
      {noticesElement}
    </>
  );
}
