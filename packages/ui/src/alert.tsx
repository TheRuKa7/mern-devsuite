import * as React from "react";
import { cn } from "./cn";

export type AlertVariant = "info" | "success" | "warning" | "error";

const VARIANT: Record<AlertVariant, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
