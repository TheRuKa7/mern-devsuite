/**
 * `cn` — conditionally-merged Tailwind classnames.
 *
 * Pattern borrowed from shadcn/ui: `clsx` handles truthy/falsy class
 * composition, `twMerge` deduplicates conflicting Tailwind utilities
 * (e.g. `px-2 px-4` -> `px-4`). Every UI primitive below accepts a
 * `className` prop and routes it through `cn` so consumers can
 * override without `!important` battles.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
