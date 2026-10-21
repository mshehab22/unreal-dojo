// Activity streak: a completed drill or passed quest within every 3 days, kept alive by freezes, with milestones.
import type { PlayerProgress } from "@shared/types/progress";

import { calendarDaysBetween } from "./calendarDays";
import { MAX_FREEZES, STREAK_MILESTONES, STREAK_WINDOW_DAYS } from "./rules";

/** The streak after one activity. */
export interface StreakUpdate
{
	/** The new streak. */
	streak: PlayerProgress["streak"];

	/** A milestone (7, 30, 100) this activity reached, if any. */
	milestoneReached?: number;

	/** Freezes spent to bridge the gap. */
	freezesUsed: number;
}

/** Streak rules. Pure: returns a new streak. The count is active calendar days. */
export class StreakRules
{
	/** Freezes needed to bridge a gap of this many calendar days (0 within the 3-day window; each freeze covers 3 more days). */
	freezesNeeded(gapDays: number): number
	{
		if (gapDays <= STREAK_WINDOW_DAYS) return 0;

		return Math.ceil((gapDays - STREAK_WINDOW_DAYS) / STREAK_WINDOW_DAYS);
	}

	/** Records an activity at `at`. Same day: no change. Within 3 days: +1. Longer: freezes are spent automatically; without enough the streak restarts at 1. No repairs. */
	recordActivity(streak: PlayerProgress["streak"], at: Date): StreakUpdate
	{
		const lastActivity = streak.lastActivityAt ? new Date(streak.lastActivityAt) : null;
		const gapDays = lastActivity ? calendarDaysBetween(lastActivity, at) : null;

		if (gapDays !== null && gapDays <= 0) return { streak: { ...streak, milestones: [...streak.milestones], lastActivityAt: at.toISOString() }, freezesUsed: 0 };

		let count = 1;
		let freezes = streak.freezes;
		let freezesUsed = 0;

		if (gapDays !== null)
		{
			const needed = this.freezesNeeded(gapDays);

			if (needed <= freezes)
			{
				count = streak.count + 1;
				freezes -= needed;
				freezesUsed = needed;
			}
		}

		const milestones = [...streak.milestones];
		const milestoneReached = STREAK_MILESTONES.find((milestone) => milestone === count);

		if (milestoneReached !== undefined && !milestones.includes(milestoneReached)) milestones.push(milestoneReached);

		const update: StreakUpdate = { streak: { count, lastActivityAt: at.toISOString(), freezes, milestones }, freezesUsed };
		if (milestoneReached !== undefined) update.milestoneReached = milestoneReached;

		return update;
	}

	/** The count to show at `now`: the stored count if the held freezes can still bridge the gap, else 0. Spends nothing. */
	countAt(streak: PlayerProgress["streak"], now: Date): number
	{
		if (!streak.lastActivityAt) return 0;

		const gapDays = calendarDaysBetween(new Date(streak.lastActivityAt), now);

		return this.freezesNeeded(gapDays) <= streak.freezes ? streak.count : 0;
	}

	/** Adds one freeze (earned per boss, or from a chest), capped at two. */
	earnFreeze(streak: PlayerProgress["streak"]): PlayerProgress["streak"]
	{
		return { ...streak, milestones: [...streak.milestones], freezes: Math.min(MAX_FREEZES, streak.freezes + 1) };
	}
}
