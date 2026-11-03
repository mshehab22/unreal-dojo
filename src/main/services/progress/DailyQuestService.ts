// The daily quest: three offers per calendar day, one chosen, a chest when done, a badge for a full month. Missing days costs nothing.
import type { DailyOffer, DailyOfferKind, DailyQuestState, QuestAvailability } from "@shared/types/progress";

import { daysOfLocalMonth, localDayKey, localMonthKey } from "./calendarDays";
import type { RandomSource } from "./RandomSource";
import type { RuleQuest } from "./RuleQuest";

/** Quests the daily quest may offer today. */
export interface DailyCandidates
{
	/** Available concept quest ids. */
	conceptQuestIds: string[];

	/** Available short build quest ids (`scaffold: worked`, no new class, so the fast loop applies). */
	shortBuildQuestIds: string[];

	/** True when a scheduled item is due today, so a drill can be rewarded and finish the daily offer (A320). Without one the drill offer is left out (A1393). */
	hasDueDrillItems: boolean;
}

/** What completing an activity did to the daily quest. */
export interface DailyCompletion
{
	/** The daily state after. */
	state: DailyQuestState;

	/** True when this activity finished today's chosen offer (a chest is earned). */
	completedNow: boolean;

	/** The month badge earned by it, if any. */
	monthBadge?: string;
}

/** Daily quest service. Pure: time and randomness come in as arguments. */
export class DailyQuestService
{
	/** A short build the daily quest may offer: a build quest with `scaffold: worked` that adds no new class, so the fast loop applies. */
	isShortBuild(quest: RuleQuest): boolean
	{
		return quest.kind === "build" && quest.scaffold === "worked" && !quest.addsNewClass;
	}

	/** Today's candidates from the open quests: available or in-progress concept quests and short builds, and whether a drill would be rewarded today. */
	candidatesFrom(quests: RuleQuest[], availability: Record<string, QuestAvailability>, hasDueDrillItems: boolean): DailyCandidates
	{
		const open = quests.filter((quest) => availability[quest.id]?.status === "available" || availability[quest.id]?.status === "in_progress");

		return {
			conceptQuestIds: open.filter((quest) => quest.kind === "concept").map((quest) => quest.id),
			shortBuildQuestIds: open.filter((quest) => this.isShortBuild(quest)).map((quest) => quest.id),
			hasDueDrillItems,
		};
	}

	/**
	 * The state for `now`: unchanged on the same day, otherwise up to three fresh offers (drill, concept, short build). An offer with no candidate is left out:
	 * the drill when nothing is scheduled due today, since such a drill is practice and could never finish the daily quest (A1393).
	 */
	refresh(state: DailyQuestState, now: Date, candidates: DailyCandidates, random: RandomSource): DailyQuestState
	{
		const today = localDayKey(now);
		if (state.date === today) return state;

		const offered: DailyOffer[] = candidates.hasDueDrillItems ? [{ kind: "drill" }] : [];
		const conceptQuestId = this.pickRandom(candidates.conceptQuestIds, random);
		const buildQuestId = this.pickRandom(candidates.shortBuildQuestIds, random);

		if (conceptQuestId) offered.push({ kind: "concept", questId: conceptQuestId });
		if (buildQuestId) offered.push({ kind: "build", questId: buildQuestId });

		return { date: today, offered, done: false, monthBadges: [...state.monthBadges], completedDates: [...state.completedDates] };
	}

	/** Chooses one of today's offers. Only one choice per day. Returns null when the index is out of range or a choice was made. */
	choose(state: DailyQuestState, index: number): DailyQuestState | null
	{
		if (state.chosen !== undefined || index < 0 || index >= state.offered.length) return null;

		return { ...state, chosen: index };
	}

	/** Marks today's chosen offer done when this activity matches it. A drill offer matches any finished drill; quest offers need their quest passed. */
	complete(state: DailyQuestState, now: Date, kind: DailyOfferKind, questId?: string): DailyCompletion
	{
		const offer = state.chosen === undefined ? undefined : state.offered[state.chosen];
		const today = localDayKey(now);
		const matches = offer !== undefined && offer.kind === kind && (kind === "drill" || offer.questId === questId);

		if (state.done || state.date !== today || !matches) return { state, completedNow: false };

		const completedDates = state.completedDates.includes(today) ? [...state.completedDates] : [...state.completedDates, today];
		const month = localMonthKey(now);
		const fullMonth = daysOfLocalMonth(now).every((day) => completedDates.includes(day));
		const earnsBadge = fullMonth && !state.monthBadges.includes(month);
		const monthBadges = earnsBadge ? [...state.monthBadges, month] : [...state.monthBadges];

		const completion: DailyCompletion = { state: { ...state, done: true, completedDates, monthBadges }, completedNow: true };
		if (earnsBadge) completion.monthBadge = month;

		return completion;
	}

	/** One random element, or undefined for an empty list. */
	private pickRandom(items: string[], random: RandomSource): string | undefined
	{
		if (items.length === 0) return undefined;

		return items[Math.floor(random.next() * items.length)];
	}
}
