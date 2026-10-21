// A quest run in progress or just ended: the loop it chose and why, the phase list, elapsed time, last log line, and Cancel.
import { XIcon } from "lucide-react";

import type { BuildProgressEvent } from "@shared/types/run";

import { BuildProgressView, type BuildOutcome, type PhaseStep } from "@/components/BuildProgressView";
import { Button } from "@/components/ui/button";

/** Props for RunProgress. */
interface RunProgressProps
{
	readonly event: BuildProgressEvent | null;
	readonly outcome: BuildOutcome;
	readonly steps: readonly PhaseStep[];
	readonly onCancel: () => void;
	readonly label: string;
}

/** The progress view with the loop line above it and Cancel while it runs. */
export function RunProgress({ event, outcome, steps, onCancel, label }: RunProgressProps)
{
	return (
		<div data-testid="run-progress" className="flex flex-col gap-3 rounded-md border border-line bg-raised p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">{label}</span>
				{outcome === "running" && (
					<Button size="sm" variant="ghost" onClick={onCancel} data-testid="cancel-run">
						<XIcon />
						Cancel
					</Button>
				)}
			</div>
			{event?.loop && (
				<p className="text-xs text-paper-muted">
					{event.loop === "fast" ? "Fast loop" : "Headless loop"}
					{event.loopReason ? `: ${event.loopReason}` : ""}
				</p>
			)}
			<BuildProgressView event={event} outcome={outcome} steps={steps} />
		</div>
	);
}
