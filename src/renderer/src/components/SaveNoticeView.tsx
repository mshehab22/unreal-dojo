// A notice about the save file, shown through AppErrorView with a Dismiss button; once dismissed it stays hidden on every screen until the window reloads.
import type { AppError } from "@shared/types/errors";

import { AppErrorView } from "@/components/AppErrorView";
import { Button } from "@/components/ui/button";
import { useNoticeDismissed } from "@/hooks/useNoticeDismissed";
import { dismissNotice } from "@/lib/dismissedNotices";

/** Props for SaveNoticeView. */
interface SaveNoticeViewProps
{
	readonly notice: AppError | null | undefined;
	readonly compact?: boolean;
}

/** Shows the save notice until the learner dismisses it. Renders nothing when there is no notice. */
export function SaveNoticeView({ notice, compact = false }: SaveNoticeViewProps)
{
	const isDismissed = useNoticeDismissed(notice);

	if (!notice || isDismissed) return null;

	return (
		<div data-testid="save-notice" className="flex flex-col items-start gap-2">
			<AppErrorView error={notice} compact={compact} className="w-full" />
			<Button size="sm" variant="ghost" aria-label="Dismiss the save notice" onClick={() => dismissNotice(notice)}>
				Dismiss
			</Button>
		</div>
	);
}
