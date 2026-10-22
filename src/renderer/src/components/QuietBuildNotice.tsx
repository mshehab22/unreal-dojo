// Shown while a build has been silent for a while: says it may still be working, how long it has been quiet, and offers a status check.
import { RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatElapsed } from "@/lib/formatting";

/** Props for QuietBuildNotice. */
interface QuietBuildNoticeProps
{
	readonly silentForMs: number;
	readonly isChecking: boolean;
	readonly onCheck: () => void;
}

/** A calm note with a "Check status" button. The app also checks on its own every few seconds while the build is quiet (A822). */
export function QuietBuildNotice({ silentForMs, isChecking, onCheck }: QuietBuildNoticeProps)
{
	return (
		<div data-testid="quiet-build" className="flex items-center justify-between gap-4 rounded-lg border border-line bg-raised/50 p-3 text-sm text-paper-muted">
			<span>
				No word from the build for {formatElapsed(silentForMs)}. Unreal can work quietly on a big file; the app keeps checking on it.
			</span>
			<Button variant="secondary" size="sm" onClick={onCheck} disabled={isChecking} className="shrink-0">
				<RefreshCwIcon />
				{isChecking ? "Checking" : "Check status"}
			</Button>
		</div>
	);
}
