// The build screen's left column: scaffold level, the brief with hover terms, the concepts, pattern chips after a pass, the rubric, and the "See it in the editor" checklist.
import { useState } from "react";

import type { ScaffoldLevel } from "@shared/types/content";

import { PatternChips } from "@/components/quests/PatternChips";
import { TermText } from "@/components/TermText";
import { cn } from "@/lib/utils";

import { BriefBlock } from "./BriefBlock";
import { splitBrief } from "./splitBrief";

/** What each scaffold level means for the learner. */
const SCAFFOLD_WORDS: Readonly<Record<ScaffoldLevel, string>> = {
	worked: "Worked: explain the marked lines, then fill the gaps",
	faded: "Faded: the steps are labeled, the bodies are yours",
	stub: "Stub: the signatures are there, the rest is yours",
	blank: "Blank: the whole piece is yours",
};

/** Props for BriefColumn. */
interface BriefColumnProps
{
	readonly brief: string;
	readonly scaffold: ScaffoldLevel;
	readonly concepts: readonly string[];
	readonly rubric: readonly string[];
	readonly patternIds: readonly string[];

	/** Pattern chips show only once the quest is passed (A64). */
	readonly isPassed: boolean;
}

/** The column, scrolling on its own. */
export function BriefColumn({ brief, scaffold, concepts, rubric, patternIds, isPassed }: BriefColumnProps)
{
	const { main, seeItSteps } = splitBrief(brief);
	const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());

	/** Ticks or unticks one checklist step. */
	const toggle = (index: number): void =>
	{
		setTicked((current) =>
		{
			const next = new Set(current);

			if (next.has(index)) next.delete(index);
			else next.add(index);

			return next;
		});
	};

	return (
		<div data-testid="brief-column" className="flex flex-col gap-4">
			<span data-testid="scaffold-badge" data-scaffold={scaffold} className="self-start rounded-pill border border-pack/60 bg-pack-soft px-2.5 py-0.5 text-xs text-pack">
				{SCAFFOLD_WORDS[scaffold]}
			</span>
			<TermText markdown={main} />
			<BriefBlock title="Concepts">
				<ul className="flex flex-col gap-1.5 text-sm text-paper-muted">
					{concepts.map((concept) => (
						<li key={concept} className="border-l-2 border-pack pl-2.5">
							{concept}
						</li>
					))}
				</ul>
			</BriefBlock>
			{isPassed && patternIds.length > 0 && (
				<BriefBlock title="Patterns">
					<PatternChips patternIds={patternIds} />
				</BriefBlock>
			)}
			<BriefBlock title="Rubric">
				<ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-paper-muted">
					{rubric.map((line) => (
						<li key={line}>{line}</li>
					))}
				</ul>
			</BriefBlock>
			{seeItSteps.length > 0 && (
				<BriefBlock title="See it in the editor">
					<ul data-testid="see-it-checklist" className="flex flex-col gap-1.5">
						{seeItSteps.map((step, index) => (
							<li key={step}>
								<label className="flex cursor-pointer items-start gap-2 text-sm">
									<input type="checkbox" checked={ticked.has(index)} onChange={() => toggle(index)} className="mt-1 accent-(--color-foundations)" />
									<span className={cn(ticked.has(index) ? "text-paper-faint line-through" : "text-paper-muted")}>
										<TermText markdown={step} inline />
									</span>
								</label>
							</li>
						))}
					</ul>
				</BriefBlock>
			)}
		</div>
	);
}
