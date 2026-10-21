// The Studio's "today" block: due drill count with its start button, the streak, and the next due times.
import { PlayIcon } from "lucide-react";

import type { GlossaryEntry } from "@shared/types/content";
import type { DrillSummary, PlayerProgress, RulesSnapshot } from "@shared/types/progress";

import { DisabledWithReason } from "@/components/DisabledWithReason";
import { Panel } from "@/components/Panel";
import { StreakFlame } from "@/components/StreakFlame";
import { Button } from "@/components/ui/button";
import { formatDue, humanizeId } from "@/lib/formatting";

/** Props for TodayPanel. */
interface TodayPanelProps
{
	readonly progress: PlayerProgress;
	readonly rules: RulesSnapshot;
	readonly drills: DrillSummary;
	readonly glossary: readonly GlossaryEntry[] | undefined;
}

/** Due drills, streak, and what comes due next. */
export function TodayPanel({ progress, rules, drills, glossary }: TodayPanelProps)
{
	const termNames = new Map((glossary ?? []).map((entry) => [entry.id, entry.term]));
	const upcoming = Object.entries(progress.schedule)
		.filter(([, dueAt]) => new Date(dueAt).getTime() > Date.now())
		.sort(([, first], [, second]) => first.localeCompare(second))
		.slice(0, 4);

	return (
		<Panel title="Today" testId="studio-today" className="col-span-5">
			<div className="flex items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					<span className="font-display text-5xl leading-none font-bold tabular-nums">{drills.dueToday}</span>
					<span className="text-sm text-paper-muted">{drills.dueToday === 1 ? "item due for review" : "items due for review"}</span>
					{drills.overflow > 0 && <span className="text-xs text-paper-faint">{drills.overflow} more slid to tomorrow</span>}
				</div>
				<DisabledWithReason testId="start-drill" reason="Drill sessions open with the drill screen, which comes next (M2.2).">
					<Button variant="pack" disabled>
						<PlayIcon />
						Start drill
					</Button>
				</DisabledWithReason>
			</div>
			<StreakFlame count={progress.streak.count} freezes={progress.streak.freezes} maxFreezes={rules.maxFreezes} milestones={rules.streakMilestones} windowDays={rules.streakWindowDays} />
			{upcoming.length > 0 && (
				<div className="flex flex-col gap-1.5 border-t border-line pt-3">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Next due</span>
					<ul data-testid="next-due" className="flex flex-col gap-1">
						{upcoming.map(([itemId, dueAt]) => (
							<li key={itemId} className="flex items-baseline justify-between gap-3 text-sm">
								<span className="truncate text-paper-muted">{termNames.get(itemId) ?? humanizeId(itemId)}</span>
								<span className="shrink-0 font-mono text-2xs text-paper-faint">{formatDue(dueAt)}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</Panel>
	);
}
