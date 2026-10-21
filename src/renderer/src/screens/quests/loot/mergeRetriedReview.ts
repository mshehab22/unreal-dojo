// What the loot screen shows after Retry review. The contract records the resubmit as another attempt (A356), so a pass that was already paid keeps its loot and takes the new review.
import type { SubmitOutcome } from "@shared/types/progress";

import type { LootEntry } from "./useLootStore";

/** The entry to show after a retried review: the first attempt's loot with the new review when the first attempt passed, otherwise the retry's own loot. */
export function mergeRetriedReview(previous: LootEntry, retried: SubmitOutcome, files: Record<string, string>): LootEntry
{
	const detail = { kind: "build" as const, run: retried.run, files, ...(retried.review ? { review: retried.review } : {}) };

	if (!previous.outcome.attempt.passed) return { quest: previous.quest, outcome: retried.outcome, detail };

	// Why? and the reflection look the review up by attempt id, so the id (and its score) come from the retry.
	const attempt = { ...previous.outcome.attempt, attemptId: retried.outcome.attempt.attemptId, score: retried.outcome.attempt.score };

	return { quest: previous.quest, outcome: { ...previous.outcome, attempt }, detail };
}
