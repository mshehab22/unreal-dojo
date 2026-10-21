// A quiet line saying whether the learner's work is saved.
import type { AutosaveStatus } from "@/data/useDraftAutosave";
import { cn } from "@/lib/utils";

/** The words for each status. */
const WORDS: Readonly<Record<AutosaveStatus, string>> = {
	saved: "Saved",
	pending: "Unsaved changes",
	saving: "Saving",
	failed: "Could not save; retrying on the next change",
};

/** Props for AutosaveIndicator. */
interface AutosaveIndicatorProps
{
	readonly status: AutosaveStatus;
}

/** A dot and a word. */
export function AutosaveIndicator({ status }: AutosaveIndicatorProps)
{
	return (
		<span data-testid="autosave" data-status={status} className={cn("flex items-center gap-1.5 font-mono text-2xs tracking-wide", status === "failed" ? "text-fail" : "text-paper-faint")}>
			<span aria-hidden="true" className={cn("size-1.5 rounded-pill", status === "saved" ? "bg-pass" : status === "failed" ? "bg-fail" : "bg-warn")} />
			{WORDS[status]}
		</span>
	);
}
