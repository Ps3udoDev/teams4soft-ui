import * as React from "react";
import { cn } from "../../lib";
import { Spinner } from "../spinner/Spinner";
import type {
  FileGenerationFormat,
  FileGenerationIndicatorProps,
  FileGenerationSize,
} from "./FileGenerationIndicator.types";

const sizeClassName: Record<FileGenerationSize, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
};

const accentClassName: Record<FileGenerationFormat, string> = {
  xlsx: "text-ui-success",
  docx: "text-ui-info",
  pdf: "text-ui-danger",
  file: "text-ui-foreground/75",
};

const badgeText: Record<FileGenerationFormat, string | null> = {
  xlsx: "XLS",
  docx: "DOC",
  pdf: "PDF",
  file: null,
};

function renderFormatMotif(format: FileGenerationFormat) {
  if (format === "xlsx") {
    return (
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.85">
        <rect x="12" y="15" width="18" height="12" rx="1" fill="none" />
        <path d="M18 15v12M24 15v12M12 19h18M12 23h18" />
      </g>
    );
  }
  if (format === "docx") {
    return (
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        <path d="M12 16h18M12 20h18M12 24h14M12 28h10" />
      </g>
    );
  }
  if (format === "pdf") {
    return (
      <g>
        <rect x="11" y="16" width="20" height="10" rx="2" fill="currentColor" opacity="0.14" />
        <text
          x="21"
          y="23.5"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="700"
          fill="currentColor"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          PDF
        </text>
      </g>
    );
  }
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55">
      <path d="M13 20h16M13 25h11" />
    </g>
  );
}

/**
 * Indicador decorativo por formato de archivo en generación.
 *
 * No anuncia estado por sí mismo (`aria-hidden="true"`): compónelo dentro de
 * `<LoadingOverlay message="…" indicator={<FileGenerationIndicator format="xlsx" />} />`
 * o `<LoadingProvider>` para mantener un único `role="status"`.
 */
export const FileGenerationIndicator = React.forwardRef<
  HTMLSpanElement,
  FileGenerationIndicatorProps
>(function FileGenerationIndicator(
  { format, size = "md", unstyled = false, className, style, ...rest },
  ref,
) {
  const tag = badgeText[format];
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-slot="file-generation-indicator"
      data-format={format}
      data-size={size}
      className={cn(
        !unstyled && "relative inline-flex shrink-0 items-center justify-center",
        !unstyled && sizeClassName[size],
        !unstyled && accentClassName[format],
        className,
      )}
      style={style}
      {...rest}
    >
      <svg
        viewBox="0 0 44 44"
        fill="none"
        className={unstyled ? undefined : "h-full w-full"}
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M9 4h18l9 9v27a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          fill="var(--ui-background)"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M27 4v9h9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {renderFormatMotif(format)}
        {tag && format !== "pdf" ? (
          <text
            x="21"
            y="36.5"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="700"
            fill="currentColor"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {tag}
          </text>
        ) : null}
      </svg>
      <span
        data-slot="spinner-badge"
        className={cn(
          !unstyled &&
            "absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full border border-ui-border bg-ui-background p-0.5 text-current",
        )}
      >
        <Spinner decorative size="xs" unstyled={unstyled} />
      </span>
    </span>
  );
});

FileGenerationIndicator.displayName = "FileGenerationIndicator";
