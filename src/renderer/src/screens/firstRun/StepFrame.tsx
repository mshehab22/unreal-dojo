// The frame every setup step's content sits in: a title, one line of why, the body, and the step's buttons at the bottom.
import type { ReactNode } from "react";

/** Props for StepFrame. */
interface StepFrameProps
{
	readonly testId: string;
	readonly title: string;
	readonly lead: string;
	readonly children: ReactNode;
	readonly footer: ReactNode;
}

/** One setup step's panel. */
export function StepFrame({ testId, title, lead, children, footer }: StepFrameProps)
{
	return (
		<section data-testid={testId} className="flex min-h-0 flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-raised">
			<div className="flex flex-col gap-1.5">
				<h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
				<p className="max-w-xl text-sm text-paper-muted">{lead}</p>
			</div>
			<div className="flex flex-col gap-4">{children}</div>
			<div className="flex items-center justify-end gap-2 border-t border-line pt-4">{footer}</div>
		</section>
	);
}
