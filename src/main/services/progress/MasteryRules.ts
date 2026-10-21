// The mastery meter of one review item: rises with spaced recalls, drops one level on a miss.
import type { MasteryLevel } from "@shared/types/progress";

import { MASTERY_ORDER, MASTERY_THRESHOLDS } from "./rules";

/** Mastery rules. Pure: no I/O. */
export class MasteryRules
{
	/** Position of a level in the ladder (attempted 0 to mastered 3). */
	rank(level: MasteryLevel): number
	{
		return MASTERY_ORDER.indexOf(level);
	}

	/** True when `level` is at least `minimum`. */
	isAtLeast(level: MasteryLevel | null | undefined, minimum: MasteryLevel): boolean
	{
		if (!level) return false;

		return this.rank(level) >= this.rank(minimum);
	}

	/** The level a scheduler state earns: mastered at an interval of 30 days, proficient after 3 recalls in a row, familiar after 1, else attempted. */
	earnedLevel(repetitions: number, intervalDays: number): MasteryLevel
	{
		if (repetitions >= MASTERY_THRESHOLDS.proficientRecalls && intervalDays >= MASTERY_THRESHOLDS.masteredIntervalDays) return "mastered";
		if (repetitions >= MASTERY_THRESHOLDS.proficientRecalls) return "proficient";
		if (repetitions >= MASTERY_THRESHOLDS.familiarRecalls) return "familiar";

		return "attempted";
	}

	/** Mastery after one review. A success never lowers it; a miss drops it one level (never below attempted). An unseen item starts at attempted. */
	afterReview(current: MasteryLevel | null, successful: boolean, repetitions: number, intervalDays: number): MasteryLevel
	{
		if (!current) return successful ? this.earnedLevel(repetitions, intervalDays) : "attempted";

		if (!successful) return this.dropOne(current);

		const earned = this.earnedLevel(repetitions, intervalDays);

		return this.rank(earned) > this.rank(current) ? earned : current;
	}

	/** One level lower, never below attempted. */
	dropOne(level: MasteryLevel): MasteryLevel
	{
		return MASTERY_ORDER[Math.max(0, this.rank(level) - 1)] ?? "attempted";
	}

	/** The lowest of several levels, or null for none. */
	lowest(levels: MasteryLevel[]): MasteryLevel | null
	{
		if (levels.length === 0) return null;

		return levels.reduce((lowest, level) => (this.rank(level) < this.rank(lowest) ? level : lowest));
	}
}
