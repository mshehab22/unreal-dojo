// One small titled block of the build brief column (concepts, patterns, rubric, checklist).
import type { ReactNode } from "react";

/** Props for BriefBlock. */
interface BriefBlockProps
{
	readonly title: string;
	readonly children: ReactNode;
}

/** A rule above, a mono caps title, then the content. */
export function BriefBlock({ title, children }: BriefBlockProps)
{
	return (
		<div className="flex flex-col gap-2 border-t border-line pt-3">
			<h2 className="font-mono text-2xs font-medium tracking-widest text-paper-faint uppercase">{title}</h2>
			{children}
		</div>
	);
}
