// shadcn/ui Input, restyled with the Dojo tokens.
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** A single-line text field. */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">)
{
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"h-10 w-full min-w-0 rounded-md border border-input bg-raised px-3 text-base text-paper transition-[border-color,box-shadow] duration-(--duration-fast) outline-none placeholder:text-paper-faint focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-pack/30 disabled:opacity-40",
				className,
			)}
			{...props}
		/>
	);
}
