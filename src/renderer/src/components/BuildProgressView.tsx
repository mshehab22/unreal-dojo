// A long build's live state: which phase it is in, elapsed time, a progress bar, and the latest log line.
import { CheckIcon } from "lucide-react";

import type { BuildPhase, BuildProgressEvent } from "@shared/types/run";

import { formatElapsed } from "@/lib/formatting";
import { cn } from "@/lib/utils";

/** One phase shown in the list, with the event phases it covers. */
export interface PhaseStep
{
	label: string;
	phases: readonly BuildPhase[];
}

/** The phases of creating or rebuilding the sandbox. */
export const SANDBOX_PHASES: readonly PhaseStep[] = [
	{ label: "Copy the template", phases: ["preparing", "writing"] },
	{ label: "Full build", phases: ["building", "launching", "testing"] },
	{ label: "Check the result", phases: ["parsing", "reviewing"] },
];

/** Props for BuildProgressView. */
interface BuildProgressViewProps
{
	readonly event: BuildProgressEvent | null;
	readonly steps?: readonly PhaseStep[];
	readonly isFinished?: boolean;
}

/** The phase list on the left, the bar and log line under it. Before the first event it shows "Starting". */
export function BuildProgressView({ event, steps = SANDBOX_PHASES, isFinished = false }: BuildProgressViewProps)
{
	const currentIndex = isFinished ? steps.length : event ? Math.max(0, steps.findIndex((step) => step.phases.includes(event.phase))) : 0;
	const percent = isFinished ? 100 : (event?.percent ?? 0);

	return (
		<div data-testid="build-progress" data-phase={event?.phase ?? "starting"} className="flex flex-col gap-4">
			<ol className="flex flex-wrap gap-x-6 gap-y-2">
				{steps.map((step, index) => (
					<li key={step.label} className={cn("flex items-center gap-2 text-sm", index < currentIndex ? "text-paper-muted" : index === currentIndex ? "text-paper" : "text-paper-faint")}>
						<span
							className={cn(
								"flex size-5 items-center justify-center rounded-pill border font-mono text-2xs",
								index < currentIndex ? "border-pass bg-pass/15 text-pass" : index === currentIndex ? "border-pack text-pack" : "border-line-strong",
							)}
						>
							{index < currentIndex ? <CheckIcon className="size-3" strokeWidth={3} /> : index + 1}
						</span>
						{step.label}
					</li>
				))}
			</ol>
			<div className="flex flex-col gap-2">
				<div className="flex items-baseline justify-between">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{event ? event.phase : "Starting"}</span>
					<span data-testid="build-elapsed" className="font-display text-2xl font-bold tabular-nums">
						{formatElapsed(event?.elapsedMs ?? 0)}
					</span>
				</div>
				<div role="progressbar" aria-label="Build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded-pill bg-raised">
					<div className="h-full rounded-pill bg-pack" style={{ width: `${percent}%` }} />
				</div>
				<p className="truncate font-mono text-xs text-paper-faint">{event?.lastLine ?? "Waiting for the first line from the build"}</p>
			</div>
		</div>
	);
}
