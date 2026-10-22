// What the loot screen shows after Retry review: the same attempt and loot, with the new review in place (A741). Retry review records nothing new.
import type { CodeReview } from "@shared/types/review";

import type { LootEntry } from "./useLootStore";

/** The entry with the retried review: score, pass label, XP, and attempt id stay; only the review changes. */
export function withRetriedReview(entry: LootEntry, review: CodeReview): LootEntry
{
	if (entry.detail.kind !== "build") return entry;

	const attempt = { ...entry.outcome.attempt, review };

	return { quest: entry.quest, outcome: { ...entry.outcome, attempt }, detail: { ...entry.detail, review } };
}
