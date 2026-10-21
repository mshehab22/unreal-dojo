// Settings: reset all progress, behind a confirmation dialog. Settings and the sandbox stay.
import { RotateCcwIcon } from "lucide-react";
import { useState } from "react";

import { AppErrorView } from "@/components/AppErrorView";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoAction } from "@/data/useDojoAction";

/** Every query that reads progress, refreshed after a reset. */
const PROGRESS_KEYS = [QUERY_KEYS.progress, QUERY_KEYS.availability, QUERY_KEYS.testOut, QUERY_KEYS.daily, QUERY_KEYS.drillSummary] as const;

/** The reset button and its confirmation. */
export function ResetPanel()
{
	const [isConfirming, setConfirming] = useState(false);
	const [isDone, setDone] = useState(false);
	const reset = useDojoAction((client) => client.resetProgress(), PROGRESS_KEYS);

	/** Resets, then closes the dialog once it worked. */
	const confirm = async (): Promise<void> =>
	{
		if (await reset.run())
		{
			setConfirming(false);
			setDone(true);
		}
	};

	return (
		<Panel title="Start over" testId="settings-reset" className="border-fail/25">
			<div className="flex items-center justify-between gap-6">
				<p className="text-sm text-paper-muted">Deletes XP, cards, skills, streak, and every quest's saved work. Your engine, sandbox, and these settings stay.</p>
				<Button variant="outline" className="shrink-0 hover:border-fail hover:text-fail" onClick={() => setConfirming(true)}>
					<RotateCcwIcon />
					Reset progress
				</Button>
			</div>
			{isDone && <p className="text-xs text-paper-faint">Progress was reset.</p>}
			<Dialog open={isConfirming} onOpenChange={setConfirming}>
				<DialogContent data-testid="reset-confirm">
					<DialogTitle className="text-xl">Reset all progress?</DialogTitle>
					<DialogDescription className="text-sm text-paper-muted">This cannot be undone. Every quest goes back to locked or open, and XP starts at zero.</DialogDescription>
					{reset.error && <AppErrorView error={reset.error} compact />}
					<div className="flex justify-end gap-2">
						<DialogClose asChild>
							<Button variant="ghost">Keep my progress</Button>
						</DialogClose>
						<Button variant="destructive" onClick={confirm} disabled={reset.isPending}>
							Reset everything
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Panel>
	);
}
