import { cva, type VariantProps } from "class-variance-authority";

/**
 * Variantes visuales del botón. Solo consume tokens semánticos `--ui-*`
 * (ver src/styles/tokens.css y theme.css) — ningún color de producto
 * queda codificado aquí.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-(--radius-ui-md) font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-ui-primary text-ui-primary-foreground hover:bg-ui-primary/90 active:bg-ui-primary/80",
        secondary:
          "border border-ui-border bg-ui-muted text-ui-foreground hover:bg-ui-muted/70",
        outline:
          "border border-ui-border bg-transparent text-ui-foreground hover:bg-ui-muted",
        ghost: "bg-transparent text-ui-foreground hover:bg-ui-muted",
        danger:
          "bg-ui-danger text-ui-primary-foreground hover:bg-ui-danger/90 active:bg-ui-danger/80",
        link: "bg-transparent text-ui-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    compoundVariants: [
      // `link` no lleva relleno ni altura fija: se comporta como texto en línea.
      { variant: "link", size: ["sm", "md", "lg"], class: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
