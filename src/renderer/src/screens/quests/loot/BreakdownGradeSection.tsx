// The breakdown grade on the loot screen: required pieces covered or missing, concerns, strengths, and how much the revision counted.
import { CheckIcon, XIcon } from "lucide-react";

import type { BreakdownGrade } from "@shared/types/review";

import { reviewProviderLabel } from "@/lib/reviewProviderLabel";

/** Props for BreakdownGradeSection. */
interface BreakdownGradeSectionProps
{
	readonly grade: BreakdownGrade;
}

/** The grade in lists. Pieces the plan missed are named so they come back in the next drill. */
export function BreakdownGradeSection({ grade }: BreakdownGradeSectionProps)
{
	return (
		<div data-testid="breakdown-grade" className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Graded by {reviewProviderLabel(grade.provider)}, revision quality {grade.revisionQuality}</span>
				{grade.fallbackReason && <p className="text-sm text-warn">{grade.fallbackReason}</p>}
				<p className="text-base text-paper">{grade.summary}</p>
			</div>
			<ul data-testid="required-pieces" className="flex flex-col gap-1.5">
				{grade.requiredPiecesCovered.map((piece) => (
					<li key={piece.label} data-covered={piece.covered} className="flex items-start gap-2 text-sm">
						{piece.covered ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-pass" strokeWidth={3} /> : <XIcon className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={3} />}
						<span className={piece.covered ? "text-paper" : "text-paper-muted"}>
							{piece.label}
							{piece.matchedTo && <span className="text-paper-faint"> (your "{piece.matchedTo}")</span>}
						</span>
					</li>
				))}
			</ul>
			{grade.concerns.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Concerns</span>
					<ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-paper-muted">
						{grade.concerns.map((concern) => (
							<li key={concern}>{concern}</li>
						))}
					</ul>
				</div>
			)}
			{grade.strengths.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Strengths</span>
					<ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-paper-muted">
						{grade.strengths.map((strength) => (
							<li key={strength}>{strength}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
