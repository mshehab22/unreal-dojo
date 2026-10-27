// A hook that tells whether a one-time notice was dismissed, and re-renders the caller the moment it is.
import { useSyncExternalStore } from "react";

import type { AppError } from "@shared/types/errors";

import { isNoticeDismissed, readDismissalCount, subscribeToDismissals } from "@/lib/dismissedNotices";

/** True when there is no notice or the learner dismissed it, so the caller shows nothing. */
export function useNoticeDismissed(notice: AppError | null | undefined): boolean
{
	useSyncExternalStore(subscribeToDismissals, readDismissalCount);

	return !notice || isNoticeDismissed(notice);
}
