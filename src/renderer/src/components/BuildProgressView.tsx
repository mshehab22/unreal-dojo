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

/** How the build stands: still going, or how it ended. */
export type BuildOutcome = "running" | "succeeded" | "failed" | "cancelled";

/** Props for BuildProgressView. */
interface BuildProgressViewProps
{
	readonly event: BuildProgressEvent | null;
	readonly outcome: BuildOutcome;
	readonly steps?: readonly PhaseStep[];

	/** Elapsed time from the window's own clock, so the timer keeps moving when events are slow. Defaults to the last event's figure. */
	readonly elapsedMs?: number;
}

/** The label above the bar: the live phase while running, otherwise how it ended. */
function statusLabel(event: BuildProgressEvent | null, outcome: BuildOutcome): string
{
	if (outcome === "succeeded") return "Done";
	if (outcome === "failed") return "Failed";
	if (outcome === "cancelled") return "Cancelled";

	return event ? event.phase : "Starting";
}

/** The phase list, then the status, elapsed time, bar, and latest log line. A failed bar turns red; a cancelled one goes quiet. */
export function BuildProgressView({ event, outcome, steps = SANDBOX_PHASES, elapsedMs }: BuildProgressViewProps)
{
	const isFinished = outcome === "succeeded";
	const currentIndex = isFinished ? steps.length : event ? Math.max(0, steps.findIndex((step) => step.phases.includes(event.phase))) : 0;
	const percent = isFinished ? 100 : (event?.percent ?? 0);
	const barClass = outcome === "failed" ? "bg-fail" : outcome === "cancelled" ? "bg-line-strong" : "bg-pack";

	return (
		<div data-testid="build-progress" data-phase={event?.phase ?? "starting"} data-outcome={outcome} className="flex flex-col gap-4">
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
					<span className={cn("font-mono text-2xs tracking-widest uppercase", outcome === "failed" ? "text-fail" : "text-paper-faint")}>{statusLabel(event, outcome)}</span>
					<span data-testid="build-elapsed" className="font-display text-2xl font-bold tabular-nums">
						{formatElapsed(elapsedMs ?? event?.elapsedMs ?? 0)}
					</span>
				</div>
				<div role="progressbar" aria-label="Build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded-pill bg-raised">
					<div className={cn("h-full rounded-pill", barClass)} style={{ width: `${percent}%` }} />
				</div>
				<p className="truncate font-mono text-xs text-paper-faint">{event?.lastLine ?? "Waiting for the first line from the build"}</p>
			</div>
		</div>
	);
}
