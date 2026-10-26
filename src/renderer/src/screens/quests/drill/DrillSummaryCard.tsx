// The end of a drill: how many were right, the XP, the streak kept, when the next item is due, and any chest or test-out.
import { ArrowRightIcon, CalendarClockIcon, GraduationCapIcon } from "lucide-react";

import type { DrillRequest } from "@shared/types/drill";
import type { DrillOutcome } from "@shared/types/progress";

import { useNavigate } from "@/app/router/useRoute";
import { Chest } from "@/components/Chest";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { formatDue, formatShortDate } from "@/lib/formatting";

import { drillSummaryCopy } from "./drillSummaryCopy";

/** Props for DrillSummaryCard. */
interface DrillSummaryCardProps
{
	readonly outcome: DrillOutcome;
	readonly request: DrillRequest;
}

/** The finish card. The Parsons fallback goes back to its quest; other drills go back to the Studio. */
export function DrillSummaryCard({ outcome, request }: DrillSummaryCardProps)
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
			{outcome.testedOutWorldIds.length > 0 && (
				<p className="flex items-center gap-2 text-sm text-pass">
					<GraduationCapIcon className="size-4" />
					Tested out: its worked and faded quests can be skipped.
				</p>
			)}
			{outcome.chest && <Chest reward={outcome.chest} caption="Today's daily quest is done" />}
			<Button variant="pack" className="self-start" autoFocus onClick={() => (request.kind === "parsons-fallback" ? navigate("quest", { id: request.questId }) : navigate("studio"))}>
				{request.kind === "parsons-fallback" ? "Back to the quest" : "Back to the studio"}
				<ArrowRightIcon />
			</Button>
		</Panel>
	);
}
