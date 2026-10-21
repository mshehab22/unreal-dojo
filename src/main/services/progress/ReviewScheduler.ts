// The contract every spaced-repetition algorithm meets, so FSRS can replace SM-2 without touching its callers.
import type { ItemMemory, ReviewLogEntry } from "@shared/types/progress";

/** The scheduler's answer to one review. */
export interface ScheduledReview
{
	/** The item's state after the review (mastery included). */
	memory: ItemMemory;

	/** The entry to append to the review log. */
	logEntry: ReviewLogEntry;

	/** When the item is due next (ISO 8601). */
	dueAt: string;

	/** True when the answer was a successful recall (quality 3 or more). */
	successful: boolean;

	/** False for a successful review before the item was due: it is logged, but repetitions, interval, ease, and mastery stay, so only spaced recalls count. */
	counted: boolean;
}

/** Schedules the next review of an item from its state and the quality of this review. */
export interface ReviewScheduler
{
	/** Reviews `itemId` at `at` with SM-2 quality 0 to 5. `memory` is undefined for an item never reviewed. */
	review(itemId: string, memory: ItemMemory | undefined, quality: number, at: Date): ScheduledReview;
}
