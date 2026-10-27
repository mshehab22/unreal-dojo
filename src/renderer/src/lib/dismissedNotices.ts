// Remembers which one-time notices the learner dismissed during this run of the app, so a notice shown on Title and Settings goes away on both.
import type { AppError } from "@shared/types/errors";

/** Keys of the notices dismissed so far. Lives only as long as the window. */
const dismissedKeys = new Set<string>();

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

/** Marks the notice as dismissed. */
export function dismissNotice(notice: AppError): void
{
	dismissedKeys.add(noticeKey(notice));
}
