// Shared layout for screens that are not built yet: number, name, what the screen is for, and what will live there.
import type { ReactNode } from "react";

/** Props for PlaceholderScreen. */
interface PlaceholderScreenProps
{
	readonly testId: string;
	readonly index: number;
	readonly title: string;
	readonly summary: string;
	readonly upcoming: readonly string[];
	readonly children?: ReactNode;
}

/** A screen's name and purpose above an empty room listing what a later task builds there. */
export function PlaceholderScreen({ testId, index, title, summary, upcoming, children }: PlaceholderScreenProps)
{
	return (
		<section data-testid={testId} className="mx-auto flex w-full max-w-5xl flex-col gap-10">
			<header className="flex flex-col gap-4">
				<div className="flex items-center gap-3 font-mono text-xs tracking-widest text-paper-faint uppercase">
					<span className="text-pack">{String(index).padStart(2, "0")}</span>
					<span className="h-px w-8 bg-line-strong" />
					<span>Screen</span>
				</div>
				<h1 className="text-5xl font-bold tracking-tight">{title}</h1>
				<p className="max-w-2xl text-lg text-paper-muted">{summary}</p>
			</header>

			{children}

			<div className="rounded-xl border border-dashed border-line-strong bg-surface/40 p-8">
				<div className="mb-5 font-mono text-2xs tracking-widest text-paper-faint uppercase">Built in a later task</div>
				<ul className="grid grid-cols-2 gap-x-10 gap-y-3">
					{upcoming.map((item) => (
						<li key={item} className="flex items-baseline gap-3 text-sm text-paper-muted">
							<span aria-hidden="true" className="size-1.5 shrink-0 translate-y-[-2px] rounded-pill bg-line-strong" />
							{item}
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
