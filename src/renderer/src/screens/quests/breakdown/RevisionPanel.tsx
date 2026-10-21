// After the first submit: the reference plan's name, the patterns now named, the revision note (at least one sentence), and Grade my revision.
import { SendIcon } from "lucide-react";

import type { ReferencePlan } from "@shared/types/content";

import { PatternChips } from "@/components/quests/PatternChips";
import { Button } from "@/components/ui/button";

/** Props for RevisionPanel. */
interface RevisionPanelProps
{
	readonly reference: ReferencePlan;
	readonly patternIds: readonly string[];
	readonly note: string;
	readonly onNoteChange: (note: string) => void;
	readonly onGrade: () => void;
	readonly isGrading: boolean;
	readonly blockers: readonly string[];
}

/** True when the note holds at least one sentence of a few words. */
export function isRevisionNoteReady(note: string): boolean
{
	return note.trim().split(/\s+/).filter((word) => word.length > 0).length >= 4;
}

/** The compare step's controls. */
export function RevisionPanel({ reference, patternIds, note, onNoteChange, onGrade, isGrading, blockers }: RevisionPanelProps)
{
	const ready = isRevisionNoteReady(note) && blockers.length === 0;

	return (
		<div data-testid="revision-panel" className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Reference plan</span>
				<span className="text-sm font-medium text-paper">{reference.title}</span>
			</div>
			<PatternChips patternIds={patternIds} />
			<p className="text-xs text-paper-muted">Compare the two boards. Change yours if the reference shows you something, then say what you changed and why. Most of the grade comes from this revision.</p>
			<label className="flex flex-col gap-1">
				<span className="text-xs text-paper-faint">Revision note: at least one sentence</span>
				<textarea data-testid="revision-note" value={note} onChange={(event) => onNoteChange(event.target.value)} rows={4} maxLength={2000} className="resize-none rounded-md border border-input bg-ink px-3 py-2 text-sm text-paper outline-none select-text focus-visible:border-pack focus-visible:ring-2 focus-visible:ring-ring" />
			</label>
			{blockers.map((blocker) => (
				<p key={blocker} className="text-xs text-warn">
					{blocker}
				</p>
			))}
			<Button variant="pack" disabled={!ready || isGrading} onClick={onGrade} data-testid="grade-revision">
				<SendIcon />
				{isGrading ? "Grading" : "Grade my revision"}
			</Button>
		</div>
	);
}
