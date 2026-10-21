// The streak with its milestones (7, 30, 100 from the rules): reached ones filled, the rest outlined.
import type { PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { StreakFlame } from "@/components/StreakFlame";
import { cn } from "@/lib/utils";

/** Props for StreakMilestones. */
interface StreakMilestonesProps
{
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
}

/** Streak flame plus the milestone row. */
export function StreakMilestones({ progress, rules }: StreakMilestonesProps)
{
	const reached = new Set(progress.streak.milestones);

	return (
		<Panel title="Streak" testId="character-streak" className="col-span-4">
			<StreakFlame count={progress.streak.count} freezes={progress.streak.freezes} maxFreezes={rules.maxFreezes} milestones={rules.streakMilestones} windowDays={rules.streakWindowDays} />
			<div className="flex items-center gap-2">
				{rules.streakMilestones.map((milestone) => (
					<span
						key={milestone}
						className={cn("flex h-7 min-w-12 items-center justify-center rounded-pill border px-2 font-mono text-2xs tabular-nums", reached.has(milestone) ? "border-foundations bg-foundations-soft text-foundations" : "border-line-strong text-paper-faint")}
					>
						{milestone}
					</span>
				))}
			</div>
		</Panel>
	);
}
