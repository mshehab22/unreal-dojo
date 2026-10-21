// The Title screen's start block for a learner who finished setup: a greeting with their role, and Continue.
import { ArrowRightIcon } from "lucide-react";

import type { PlayerProgress } from "@shared/types/progress";

import { Button } from "@/components/ui/button";

/** Props for ReturningStart. */
interface ReturningStartProps
{
	readonly progress: PlayerProgress | undefined;
	readonly onContinue: () => void;
}

/** Greets the learner by name and role, then continues to the Studio. */
export function ReturningStart({ progress, onContinue }: ReturningStartProps)
{
	return (
		<div data-testid="returning-start" className="flex flex-wrap items-center gap-5">
			<Button variant="pack" size="lg" onClick={onContinue}>
				Continue
				<ArrowRightIcon />
			</Button>
			{progress && progress.playerName && (
				<p className="text-base text-paper-muted">
					Welcome back, <span className="text-paper">{progress.playerName}</span>. {progress.role} at {progress.studio.name}.
				</p>
			)}
		</div>
	);
}
