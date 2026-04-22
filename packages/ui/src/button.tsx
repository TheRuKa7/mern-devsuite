import * as React from "react";
import { cn } from "./cn";

/**
 * Button — five visual variants, three sizes.
 *
 * Kept a plain `button` under the hood (no `asChild` + Radix Slot) to
 * avoid pulling Radix into this package. When consumers need a link-
 * styled-as-button they wrap `<a>` with the same classNames via
 * `buttonStyles(...)`.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400",
  secondary:
    "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 disabled:text-neutral-400",
  outline:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 disabled:text-neutral-400",
  ghost: "text-neutral-900 hover:bg-neutral-100",
  destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonStyles(variant, size, className)}
        {...props}
      />
    );
  },
);
