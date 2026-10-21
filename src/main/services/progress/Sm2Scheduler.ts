// SM-2 spaced repetition: ease 2.5 at the start (never below 1.3), intervals 1, 3, then interval times ease.
import type { ItemMemory } from "@shared/types/progress";

import { addDays } from "./calendarDays";
import { MasteryRules } from "./MasteryRules";
import type { ReviewScheduler, ScheduledReview } from "./ReviewScheduler";
import { ANSWER_QUALITY, PASS_SCORE, QUALITY_FROM_SCORE, SM2, SUCCESSFUL_QUALITY } from "./rules";

/** SM-2 with the spec's quality mapping. Pure: time comes in as an argument. */
export class Sm2Scheduler implements ReviewScheduler
{
	/** Moves mastery after each review. */
	private readonly mastery = new MasteryRules();

	/** Quality from a 0 to 100 score: 95+ is 5, 85+ is 4, a pass is 3, a miss is 2 (score 50+) or 1. */
	qualityFromScore(score: number, passed: boolean = score >= PASS_SCORE): number
	{
		if (!passed) return score >= QUALITY_FROM_SCORE.missHighScore ? 2 : 1;
		if (score >= QUALITY_FROM_SCORE.perfect) return 5;
		if (score >= QUALITY_FROM_SCORE.good) return 4;

		return 3;
	}

	/** Quality of a plain right or wrong drill answer: 4 or 1 (A122). */
	qualityFromAnswer(correct: boolean): number
	{
		return correct ? ANSWER_QUALITY.correct : ANSWER_QUALITY.wrong;
	}

	/** The SM-2 ease after a review of this quality, never below 1.3. */
	nextEase(ease: number, quality: number): number
	{
		const distance = 5 - quality;
		const next = ease + (0.1 - distance * (0.08 + distance * 0.02));

		return Math.max(SM2.minimumEase, Math.round(next * 100) / 100);
	}

	/** Reviews one item. A success (quality 3+) moves to the next interval; a miss restarts at 1 day. Ease changes on every review. */
	review(itemId: string, memory: ItemMemory | undefined, quality: number, at: Date): ScheduledReview
	{
		const ease = memory?.ease ?? SM2.startEase;
		const previousInterval = memory?.intervalDays ?? 0;
		const successful = quality >= SUCCESSFUL_QUALITY;

		const repetitions = successful ? (memory?.repetitions ?? 0) + 1 : 0;
		const intervalDays = successful ? this.successInterval(repetitions, previousInterval, ease) : SM2.firstIntervalDays;
		const nextEase = this.nextEase(ease, quality);
		const masteryLevel = this.mastery.afterReview(memory?.mastery ?? null, successful, repetitions, intervalDays);

		const nextMemory: ItemMemory = { ...memory, ease: nextEase, intervalDays, repetitions, mastery: masteryLevel, lastReviewedAt: at.toISOString() };
		const dueAt = addDays(at, intervalDays).toISOString();

		return {
			memory: nextMemory,
			logEntry: { itemId, at: at.toISOString(), quality, intervalDays, ease: nextEase },
			dueAt,
			successful,
		};
	}

	/** Interval after the nth success in a row: 1 day, 3 days, then the previous interval times the ease (before this review's change). */
	private successInterval(repetitions: number, previousInterval: number, ease: number): number
	{
		if (repetitions === 1) return SM2.firstIntervalDays;
		if (repetitions === 2) return SM2.secondIntervalDays;

		return Math.round(previousInterval * ease);
	}
}
