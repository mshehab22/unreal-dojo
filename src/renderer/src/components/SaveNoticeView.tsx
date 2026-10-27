// A one-time notice about the save file, shown through AppErrorView with a Dismiss button; once dismissed it stays gone for this run of the app.
import { useState } from "react";

import type { AppError } from "@shared/types/errors";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { dismissNotice, isNoticeDismissed } from "@/lib/dismissedNotices";

/** Props for SaveNoticeView. */
interface SaveNoticeViewProps
{
	readonly notice: AppError | null | undefined;
	readonly compact?: boolean;
}

/** Shows the save notice until the learner dismisses it. Renders nothing when there is no notice. */
export function SaveNoticeView({ notice, compact = false }: SaveNoticeViewProps)
{
	const [, setDismissCount] = useState(0);

	if (!notice || isNoticeDismissed(notice)) return null;

	/** Hides the notice here and on every other screen that shows it. */
	const dismiss = (): void =>
	{
		dismissNotice(notice);
		setDismissCount((count) => count + 1);
	};

	return (
		<div data-testid="save-notice" className="flex flex-col items-start gap-2">
			<AppErrorView error={notice} compact={compact} className="w-full" />
			<Button size="sm" variant="ghost" onClick={dismiss}>
				Dismiss
			</Button>
		</div>
	);
}
