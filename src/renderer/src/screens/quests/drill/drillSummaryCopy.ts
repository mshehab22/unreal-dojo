// The words the drill's finish card shows, from the outcome: the score of graded items, what is due again, and the self-checked items said plainly (A801, A940).
import type { DrillOutcome } from "@shared/types/progress";

/** The card's headline: a graded score, or, when nothing was graded, how many were explained. */
export type DrillHeadline = { kind: "score"; correct: number; total: number } | { kind: "explained"; count: number };

/** Everything the card says about the answers. */
export interface DrillSummaryCopy
{
	headline: DrillHeadline;

	/** Graded misses only; null when every graded item was right. */
	dueLine: string | null;

	/** Self-checked explain items, said as such; null when there were none. */
	selfCheckedLine: string | null;
}

/** Builds the copy. Self-checked items are never misses and never due; a drill with no graded item shows how many were explained instead of "0/0". */
export function drillSummaryCopy(outcome: Pick<DrillOutcome, "correctCount" | "totalCount" | "selfCheckedCount">): DrillSummaryCopy
{
	const missed = Math.max(0, outcome.totalCount - outcome.correctCount);
	const selfChecked = outcome.selfCheckedCount;

	return {
		headline: outcome.totalCount > 0 ? { kind: "score", correct: outcome.correctCount, total: outcome.totalCount } : { kind: "explained", count: selfChecked },
		dueLine: missed === 0 ? null : `${missed === 1 ? "One item is" : `${missed} items are`} due for review and will come back sooner.`,
		selfCheckedLine: selfChecked === 0 ? null : selfChecked === 1 ? "1 explained in your own words, not graded. Compare it with the model answer; it stays in your drills until a reviewer can grade it." : `${selfChecked} explained in your own words, not graded. Compare them with the model answers; they stay in your drills until a reviewer can grade them.`,
	};
}
