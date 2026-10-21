// A titled surface for one block of a screen, with an optional action in its header.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Props for Panel. */
interface PanelProps
{
	readonly title?: string;
	readonly action?: ReactNode;
	readonly children: ReactNode;
	readonly className?: string;
	readonly testId?: string;
}

/** A card-like section on the surface color with a small uppercase title. */
export function Panel({ title, action, children, className, testId }: PanelProps)
{
	return (
		<section data-testid={testId} className={cn("flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-raised", className)}>
			{(title || action) && (
				<div className="flex min-h-6 items-center justify-between gap-3">
					{title && <h2 className="font-mono text-2xs font-medium tracking-widest text-paper-faint uppercase">{title}</h2>}
					{action}
				</div>
			)}
			{children}
		</section>
	);
}
