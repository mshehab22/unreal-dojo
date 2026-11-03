// The reference solution once viewed: one tab per file, read-only code, and what the view cost (A1392).
import { CalendarClockIcon, GemIcon } from "lucide-react";
import { useState } from "react";

import type { SolutionViewing } from "@shared/types/progress";

import { CodeBlock } from "@/components/quests/CodeBlock";
import { formatDue } from "@/lib/formatting";
import { cn } from "@/lib/utils";

/** Props for ReferenceSolutionView. */
interface ReferenceSolutionViewProps
{
	readonly viewing: SolutionViewing;
	readonly rematchShare: number;
}

/** The price line for a view. */
function priceLine(viewing: SolutionViewing): string
{
	if (viewing.stoneSpent) return "A Seer Stone paid for this view, so a pass still earns this quest's XP.";
	if (viewing.xpForfeited) return "Viewed with this quest's XP: its first pass pays no XP.";
	if (viewing.alreadyViewed) return "Viewed before, so seeing it again is free.";

	return "Free to view: this quest is passed.";
}

/** File tabs over the code; the first file opens. */
export function ReferenceSolutionView({ viewing, rematchShare }: ReferenceSolutionViewProps)
{
	const fileNames = Object.keys(viewing.files);
	const [activeFile, setActiveFile] = useState(fileNames[0] ?? "");

	return (
		<div data-testid="reference-solution" className="flex min-w-0 flex-col gap-3">
			<p className="flex items-center gap-2 text-sm text-paper-muted">
				<GemIcon className="size-4 shrink-0 text-patterns" />
				{priceLine(viewing)}
			</p>
			{viewing.rematchDueAt && (
				<p data-testid="solution-rematch" className="flex items-center gap-2 text-sm text-paper-muted">
					<CalendarClockIcon className="size-4 shrink-0 text-warn" />
					A rematch comes due {formatDue(viewing.rematchDueAt)}: rebuild it from memory then for {Math.round(rematchShare * 100)}% of the XP.
				</p>
			)}
			<div role="tablist" aria-label="Solution files" className="flex flex-wrap gap-1 border-b border-line">
				{fileNames.map((name) => (
					<button
						key={name}
						type="button"
						role="tab"
						aria-selected={name === activeFile}
						data-testid="solution-file-tab"
						onClick={() => setActiveFile(name)}
						className={cn("-mb-px rounded-t-md border border-b-0 px-3 py-1.5 font-mono text-xs transition-colors duration-(--duration-fast)", name === activeFile ? "border-line bg-ink text-paper" : "border-transparent text-paper-faint hover:text-paper")}
					>
						{name}
					</button>
				))}
			</div>
			<CodeBlock code={viewing.files[activeFile] ?? ""} className="max-h-[50vh] overflow-y-auto" />
		</div>
	);
}
