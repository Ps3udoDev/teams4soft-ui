import * as React from "react";
import { FeedbackDialog } from "../../overlays/feedback-dialog/FeedbackDialog";
import type { EntityLookupMessages } from "./lookup-core.types";

export type NotFoundOutcome = "created" | "dismissed" | "kept";

export interface UseLookupNoticesOptions {
  /** Already merged with the caller's overrides. */
  messages: EntityLookupMessages;
  notFoundMessage?: React.ReactNode | ((query: string) => React.ReactNode);
  onCreateRequest?(query: string): void;
}

export interface UseLookupNoticesResult {
  showNotFound(label: string, emptyMessage?: React.ReactNode): Promise<NotFoundOutcome>;
  showQueryRequired(): Promise<void>;
  noticesElement: React.ReactNode;
}

type Notice =
  | { kind: "notFound" | "create"; label: string }
  | { kind: "empty"; label: string; message: React.ReactNode }
  | { kind: "queryRequired" };

/** Local FeedbackDialog so the lookup components work without any feedback provider. */
export function useLookupNotices({ messages, notFoundMessage, onCreateRequest }: UseLookupNoticesOptions): UseLookupNoticesResult {
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const settleRef = React.useRef<((outcome: NotFoundOutcome) => void) | null>(null);
  const latest = React.useRef({ notFoundMessage, onCreateRequest });
  latest.current = { notFoundMessage, onCreateRequest };

  const settle = React.useCallback((outcome: NotFoundOutcome) => {
    const pending = settleRef.current;
    settleRef.current = null;
    setNotice(null);
    pending?.(outcome);
  }, []);

  React.useEffect(() => () => {
    const pending = settleRef.current;
    settleRef.current = null;
    pending?.("kept");
  }, []);

  const open = React.useCallback((next: Notice) => new Promise<NotFoundOutcome>((resolve) => {
    // A replaced notice must not leave its caller hanging.
    settleRef.current?.("kept");
    settleRef.current = resolve;
    setNotice(next);
  }), []);

  const showNotFound = React.useCallback((label: string, emptyMessage?: React.ReactNode) => {
    if (emptyMessage !== undefined && emptyMessage !== null) return open({ kind: "empty", label, message: emptyMessage });
    return open({ kind: latest.current.onCreateRequest ? "create" : "notFound", label });
  }, [open]);

  const showQueryRequired = React.useCallback(() => open({ kind: "queryRequired" }).then(() => undefined), [open]);

  let noticesElement: React.ReactNode = null;
  if (notice) {
    const confirm = notice.kind === "create";
    let message: React.ReactNode;
    if (notice.kind === "create") message = messages.createPrompt(notice.label);
    else if (notice.kind === "notFound") {
      const custom = notFoundMessage;
      message = typeof custom === "function" ? custom(notice.label) : custom ?? messages.notFound(notice.label);
    } else if (notice.kind === "empty") message = notice.message;
    else message = messages.queryRequired;

    noticesElement = (
      <FeedbackDialog
        open
        variant={confirm ? "confirm" : "notice"}
        severity={confirm ? "warn" : "info"}
        message={message}
        showReject={confirm}
        acceptLabel={confirm ? messages.createAccept : messages.accept}
        rejectLabel={confirm ? messages.createReject : undefined}
        onAccept={() => {
          if (notice.kind === "create") {
            latest.current.onCreateRequest?.(notice.label);
            settle("created");
          } else settle(notice.kind === "notFound" ? "dismissed" : "kept");
        }}
        onReject={() => settle("kept")}
        onOpenChange={(next) => { if (!next) settle("kept"); }}
      />
    );
  }

  return { showNotFound, showQueryRequired, noticesElement };
}
