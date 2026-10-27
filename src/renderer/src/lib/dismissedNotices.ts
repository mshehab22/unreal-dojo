// Remembers which one-time notices the learner dismissed, outside the query cache, so a notice the main process repeats on every read stays hidden on every screen until the window reloads.
import type { AppError } from "@shared/types/errors";

/** Keys of the notices dismissed so far. Lives only as long as the window. */
const dismissedKeys = new Set<string>();

/** Everyone who wants to know when a notice is dismissed. */
const listeners = new Set<() => void>();

/** Counts dismissals, so a subscriber has a cheap value that changes whenever one happens. */
let dismissalCount = 0;

/** Two notices are the same when their code and message match. */
function noticeKey(notice: AppError): string
{
	return `${notice.code}:${notice.message}`;
}

/** Tells whether the learner already dismissed this notice. */
export function isNoticeDismissed(notice: AppError): boolean
{
	return dismissedKeys.has(noticeKey(notice));
}

/** Marks the notice as dismissed and tells every subscriber. */
export function dismissNotice(notice: AppError): void
{
	dismissedKeys.add(noticeKey(notice));
	dismissalCount += 1;

	for (const listener of listeners) listener();
}

/** Adds a listener for dismissals and returns the function that removes it. */
export function subscribeToDismissals(listener: () => void): () => void
{
	listeners.add(listener);

	return () => listeners.delete(listener);
}

/** A number that changes whenever a notice is dismissed. */
export function readDismissalCount(): number
{
	return dismissalCount;
}
