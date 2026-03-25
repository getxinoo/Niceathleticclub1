import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn – merge Tailwind classes with clsx + tailwind-merge.
 * Resolves conflicts (e.g. "px-4 px-6" → "px-6") and handles
 * conditional class names cleanly.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-brand", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
