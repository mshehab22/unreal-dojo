// What finishing a drill earns in the fake, by the progress service's rule: only a finished drill with at least one graded answer pays or tests a world out (A801, A943).
import type { DrillRequest } from "@shared/types/drill";

/** The answers of a finished session, counted. */
export interface DrillTally
{
	answeredAll: boolean;

	/** Answers that were graded (every answer except self-checked ones). */
	gradedCount: number;

	/** Graded answers that were right. */
	correctCount: number;
}

/** Whether the drill pays XP, the streak, and the daily credit, and whether it tests its world out. Self-checked items stay due, so a drill of only those earns nothing, or it would pay again every time. */
export function drillReward(kind: DrillRequest["kind"], tally: DrillTally): { pays: boolean; testsOut: boolean }
{
	const hasGradedAnswer = tally.gradedCount > 0;
	const finished = tally.answeredAll && hasGradedAnswer;

	return {
		pays: finished && kind !== "parsons-fallback",
		testsOut: finished && kind === "test-out" && tally.correctCount === tally.gradedCount,
	};
}
