// The heading block every screen starts with: an eyebrow line, the title, an optional summary, and actions on the right.
import type { ReactNode } from "react";

/** Props for ScreenHeader. */
interface ScreenHeaderProps
{
	readonly eyebrow: string;
	readonly title: string;
	readonly summary?: string;
	readonly actions?: ReactNode;
}

/** A screen's title row. The title is the page's only h1. */
export function ScreenHeader({ eyebrow, title, summary, actions }: ScreenHeaderProps)
{
	return (
		<header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
			<div className="flex min-w-0 flex-col gap-3">
				<div className="flex items-center gap-3 font-mono text-xs tracking-widest text-paper-faint uppercase">
					<span className="h-px w-6 bg-pack" />
					<span>{eyebrow}</span>
				</div>
				<h1 className="text-4xl font-bold tracking-tight">{title}</h1>
				{summary && <p className="max-w-2xl text-base text-paper-muted">{summary}</p>}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</header>
	);
}
