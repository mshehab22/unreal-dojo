// The end of a drill: how many were right, the XP, the streak kept, when the next item is due, and any chest or test-out.
import { ArrowRightIcon, CalendarClockIcon, GraduationCapIcon } from "lucide-react";

import type { DrillRequest } from "@shared/types/drill";
import type { DrillOutcome } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { DailyReward } from "@/components/DailyReward";
import { Panel } from "@/components/Panel";
import { StreakCelebration } from "@/components/StreakCelebration";
import { Button } from "@/components/ui/button";
import { formatDue, formatShortDate } from "@/lib/formatting";

import { drillSummaryCopy } from "./drillSummaryCopy";

/** Props for DrillSummaryCard. */
interface DrillSummaryCardProps
{
	readonly outcome: DrillOutcome;
	readonly request: DrillRequest;

	/** The streak milestones from the rules, to name the next one after a celebration. */
	readonly streakMilestones: readonly number[];

	/** The world a test-out drill covered, by title, for its result line. */
	readonly testOutWorldTitle?: string;
}

/** The finish card. The Parsons fallback goes back to its quest, a test-out to the map, a due drill to the Studio. */
export function DrillSummaryCard({ outcome, request, streakMilestones, testOutWorldTitle }: DrillSummaryCardProps)
{
	const navigate = useNavigate();
	const copy = drillSummaryCopy(outcome);

	return (
		<Panel title="Drill done" testId="drill-summary" className="max-w-2xl">
			<div className="flex items-end gap-6">
				{copy.headline.kind === "score" ? (
					<span data-testid="drill-score" className="font-display text-5xl leading-none font-bold tabular-nums">
						{copy.headline.correct}
						<span className="text-2xl text-paper-faint">/{copy.headline.total}</span>
					</span>
				) : (
					<span data-testid="drill-explained" className="flex items-baseline gap-2 font-display text-5xl leading-none font-bold tabular-nums">
						{copy.headline.count}
						<span className="text-2xl text-paper-faint">explained</span>
					</span>
				)}
				<div className="flex flex-col gap-1 pb-1 text-sm text-paper-muted">
					<span>{outcome.xpGained > 0 ? `+${outcome.xpGained} XP` : "Practice only, no XP"}</span>
					<span>{outcome.streak.count} day streak kept</span>
				</div>
			</div>
			{copy.dueLine && <p data-testid="drill-due-line" className="text-sm text-paper-muted">{copy.dueLine}</p>}
			{copy.selfCheckedLine && <p data-testid="drill-self-checked" className="text-sm text-paper-muted">{copy.selfCheckedLine}</p>}
			<p className="flex items-center gap-2 text-sm text-paper-muted">
				<CalendarClockIcon className="size-4 text-pack" />
				{outcome.nextDueAt ? `Next item due ${formatDue(outcome.nextDueAt)} (${formatShortDate(outcome.nextDueAt)}).` : "Nothing else is scheduled yet."}
			</p>
			{outcome.streak.milestoneReached !== undefined && (
				<StreakCelebration milestone={outcome.streak.milestoneReached} nextMilestone={streakMilestones.find((milestone) => milestone > (outcome.streak.milestoneReached ?? 0))} />
			)}
			{request.kind === "test-out" && (
				<p data-testid="test-out-result" data-tested-out={outcome.testedOutWorldIds.length > 0} className={outcome.testedOutWorldIds.length > 0 ? "flex items-center gap-2 text-sm text-pass" : "flex items-center gap-2 text-sm text-paper-muted"}>
					<GraduationCapIcon className="size-4 shrink-0" />
					{outcome.testedOutWorldIds.length > 0
						? `Tested out of ${testOutWorldTitle ?? "this world"}: its worked and faded build quests can be skipped on the map. The boss still waits for you.`
						: `Not tested out yet: every term of ${testOutWorldTitle ?? "this world"} has to stay proficient. The items you missed are due for review; try again once they are.`}
				</p>
			)}
			<DailyReward chest={outcome.chest} monthBadge={outcome.monthBadge} />
			<Button variant="pack" className="self-start" autoFocus data-testid="drill-done" onClick={() => (request.kind === "parsons-fallback" ? navigate("quest", { id: request.questId }) : navigate(request.kind === "test-out" ? "worldMap" : "studio"))}>
				{request.kind === "parsons-fallback" ? "Back to the quest" : request.kind === "test-out" ? "Back to the map" : "Back to the studio"}
				<ArrowRightIcon />
			</Button>
		</Panel>
	);
}
