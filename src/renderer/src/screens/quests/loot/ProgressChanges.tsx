// Everything an attempt changed besides XP: level and role, cards unlocked or upgraded (flipping in), skills up or due for review, spree, streak, chest, unlocks, and what comes due next.
import { ArrowUpIcon, CalendarClockIcon, FlameIcon, LockOpenIcon, TargetIcon } from "lucide-react";

import type { PatternCard } from "@shared/types/content";
import type { AttemptOutcome, RulesSnapshot } from "@shared/types/progress";

import "./lootMotion.css";

import { Chest } from "@/components/Chest";
import { PatternCard as PatternCardView } from "@/components/PatternCard";
import { formatDue, humanizeId } from "@/lib/formatting";
import { MASTERY_NAMES, skillLabel } from "@/lib/skillNames";

/** Props for ProgressChanges. */
interface ProgressChangesProps
{
	readonly outcome: AttemptOutcome;
	readonly rules: RulesSnapshot;
	readonly patternCards: readonly PatternCard[];
	readonly questTitles: ReadonlyMap<string, string>;
}

/** The order masteries rise in, to tell up from down. */
const MASTERY_ORDER = ["attempted", "familiar", "proficient", "mastered"] as const;

/** Rows of changes; cards get the flip-in reward motion, nothing else moves. */
export function ProgressChanges({ outcome, rules, patternCards, questTitles }: ProgressChangesProps)
{
	const cards = new Map(patternCards.map((card) => [card.id, card]));
	const leveledUp = outcome.level.after > outcome.level.before;
	const newRole = outcome.role.after !== outcome.role.before;

	return (
		<div data-testid="progress-changes" className="flex flex-col gap-4 text-sm">
			{(leveledUp || newRole) && (
				<p data-testid="level-change" className="flex items-center gap-2 font-medium text-pack">
					<ArrowUpIcon className="size-4" />
					{leveledUp ? `Level ${outcome.level.after}` : ""}
					{leveledUp && newRole ? ", " : ""}
					{newRole ? `now ${outcome.role.after}` : ""}
				</p>
			)}

			{outcome.cardChanges.length > 0 && (
				<div className="flex flex-wrap gap-3">
					{outcome.cardChanges.map((change, index) =>
					{
						const card = cards.get(change.patternId);

						return card ? (
							<div key={change.patternId} className="loot-flip-in w-56" style={{ animationDelay: `calc(var(--duration-base) * ${index})` }} data-testid="card-change">
								<PatternCardView card={card} tier={change.tierAfter} useCasesPassed={rules.cardTierThresholds[change.tierAfter]} tierThresholds={rules.cardTierThresholds} />
								<p className="pt-1.5 text-xs text-paper-muted">{change.tierBefore ? `${change.tierBefore} to ${change.tierAfter}` : `Unlocked, ${change.tierAfter}`}</p>
							</div>
						) : null;
					})}
				</div>
			)}

			{outcome.skillChanges.length > 0 && (
				<ul data-testid="skill-changes" className="flex flex-col gap-1">
					{outcome.skillChanges.map((change) =>
					{
						const fell = change.masteryBefore !== null && MASTERY_ORDER.indexOf(change.masteryAfter) < MASTERY_ORDER.indexOf(change.masteryBefore);

						return (
							<li key={change.skillId} className="flex items-baseline justify-between gap-3">
								<span className="text-paper-muted">{skillLabel(change.skillId.split(".").pop() ?? change.skillId)}</span>
								<span className={fell ? "text-warn" : "text-paper"}>
									{change.pointsGained > 0 ? `+${change.pointsGained} points, ` : ""}
									{fell ? `${MASTERY_NAMES[change.masteryAfter]}, due for review` : MASTERY_NAMES[change.masteryAfter]}
								</span>
							</li>
						);
					})}
				</ul>
			)}

			<div className="flex flex-wrap gap-x-6 gap-y-2 text-paper-muted">
				<span className="flex items-center gap-1.5">
					<TargetIcon className="size-4 text-pack" />
					Spree {outcome.spree.current} (best {outcome.spree.best}){outcome.spree.armorUsed ? ", armor absorbed the miss" : ""}
				</span>
				<span className="flex items-center gap-1.5">
					<FlameIcon className="size-4 text-pack" />
					Streak {outcome.streak.count}
					{outcome.streak.milestoneReached ? `, ${outcome.streak.milestoneReached} day milestone` : ""}
				</span>
			</div>

			{outcome.chest && <Chest reward={outcome.chest} caption="Today's daily quest is done" />}

			{outcome.unlockedQuestIds.length > 0 && (
				<p data-testid="unlocked" className="flex items-center gap-2 text-paper">
					<LockOpenIcon className="size-4 text-pass" />
					Unlocked: {outcome.unlockedQuestIds.map((questId) => questTitles.get(questId) ?? humanizeId(questId)).join(", ")}
				</p>
			)}

			{outcome.nextDueDates.length > 0 && (
				<p className="flex items-center gap-2 text-paper-muted">
					<CalendarClockIcon className="size-4 text-pack" />
					Next reviews {outcome.nextDueDates.map((dueAt) => formatDue(dueAt)).join(", ")}
				</p>
			)}
		</div>
	);
}
