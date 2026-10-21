// Small helpers shared by every UI component.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and resolves Tailwind conflicts so the last class wins. Used by every shadcn/ui component. */
export function cn(...inputs: ClassValue[]): string
{
	return twMerge(clsx(inputs));
}
