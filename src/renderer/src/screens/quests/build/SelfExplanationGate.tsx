// The worked-level gate: before the gaps open, the learner writes why each marked line exists. Then the model reasons show and editing unlocks.
import { LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { MarkedLineEntry } from "./markedLines";

/** Props for SelfExplanationGate. */
interface SelfExplanationGateProps
{
	readonly entries: readonly MarkedLineEntry[];
	readonly explanations: Readonly<Record<string, string>>;
	readonly onExplain: (key: string, text: string) => void;
	readonly isOpen: boolean;
	readonly onOpen: () => void;
	readonly onShowLine: (fileName: string, line: number) => void;
}

/** A list of marked lines with a box each; once every box has a sentence, Open the gaps unlocks the editor and shows the model reasons. */
export function SelfExplanationGate({ entries, explanations, onExplain, isOpen, onOpen, onShowLine }: SelfExplanationGateProps)
{
	const [hidden, setHidden] = useState(false);
	const explainedCount = entries.filter((entry) => (explanations[entry.key] ?? "").trim().split(/\s+/).length >= 3).length;

	return (
		<div data-testid="self-explanation-gate" data-open={isOpen} className="flex flex-col gap-3 rounded-lg border border-warn/40 bg-surface p-4">
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-sm font-medium text-paper">
					{isOpen ? <LockKeyholeOpenIcon className="size-4 text-pass" /> : <LockKeyholeIcon className="size-4 text-warn" />}
					{isOpen ? "Gaps open. Compare your reasons with these." : `Say why each marked line is there (${explainedCount} of ${entries.length})`}
				</span>
				{isOpen && (
					<Button size="sm" variant="ghost" aria-expanded={!hidden} onClick={() => setHidden(!hidden)} data-testid="toggle-reasons">
						{hidden ? "Show reasons" : "Hide reasons"}
					</Button>
				)}
			</div>
			<ol className={hidden ? "hidden" : "flex flex-col gap-3"}>
				{entries.map((entry) => (
					<li key={entry.key} className="flex flex-col gap-1.5">
						<button type="button" onClick={() => onShowLine(entry.fileName, entry.line)} className="self-start rounded-xs text-left font-mono text-xs text-warn hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
							{entry.fileName}:{entry.line} <span className="text-paper-muted">{entry.code}</span>
						</button>
						<textarea
							data-testid="self-explanation"
							aria-label={`Why is line ${entry.line} of ${entry.fileName} there?`}
							value={explanations[entry.key] ?? ""}
							onChange={(event) => onExplain(entry.key, event.target.value)}
							disabled={isOpen}
							rows={2}
							maxLength={2000}
							placeholder="This line is here because"
							className="resize-none rounded-md border border-input bg-ink px-3 py-1.5 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-80"
						/>
						{isOpen && <p className="border-l-2 border-pass pl-2.5 text-xs text-paper-muted">{entry.reason}</p>}
					</li>
				))}
			</ol>
			{!isOpen && (
				<Button variant="pack" size="sm" className="self-start" disabled={explainedCount < entries.length} onClick={onOpen} data-testid="open-gaps">
					Open the gaps
				</Button>
			)}
		</div>
	);
}
