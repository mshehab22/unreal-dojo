// The streak milestone celebration (7, 30, 100 days from the rules): one reward motion on the loot and drill finish screens, warm words, never guilt (A1395).
import "./rewardMotion.css";

import { cn } from "@/lib/utils";

/** Props for StreakCelebration. */
interface StreakCelebrationProps
{
	/** The milestone just reached, in active days. */
	readonly milestone: number;

	/** The next milestone after it, if any, from the rules. */
	readonly nextMilestone: number | undefined;
	readonly className?: string;
}

/** A lit flame with the milestone number in it, rising in once. */
export function StreakCelebration({ milestone, nextMilestone, className }: StreakCelebrationProps)
{
	return (
		<div data-testid="streak-celebration" data-milestone={milestone} role="status" className={cn("reward-rise flex items-center gap-4 rounded-lg border border-foundations/60 bg-foundations-soft p-4", className)}>
			<svg width="52" height="64" viewBox="0 0 36 44" aria-hidden="true" className="shrink-0">
				<path d="M18 2 C22 10 32 15 32 27 C32 36 25.5 42 18 42 C10.5 42 4 36 4 27 C4 20 8 15 11 12 C11 18 13 21 16 22 C14 14 15 8 18 2 Z" className="fill-foundations" />
				<path d="M18 24 C21 28 24 30 24 34 C24 38 21 40 18 40 C15 40 12 38 12 34 C12 31 15 28 18 24 Z" className="fill-warn" />
			</svg>
			<div className="flex flex-col gap-1">
				<span className="font-display text-2xl leading-tight font-bold text-paper">{milestone} day streak</span>
				<span className="text-sm text-paper-muted">
					{milestone} active days, each within the streak window. {nextMilestone ? `Next milestone: ${nextMilestone}.` : "That is every milestone."}
				</span>
			</div>
		</div>
	);
}
