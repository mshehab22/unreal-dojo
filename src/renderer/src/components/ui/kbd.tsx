// shadcn/ui Kbd: a key cap for keyboard hints.
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** One keyboard key, drawn as a small cap. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">)
{
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong border-b-2 bg-raised px-1 font-mono text-2xs font-medium text-paper-muted",
				className,
			)}
			{...props}
		/>
	);
}
