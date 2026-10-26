// A concept quest's results on the loot screen: how many were right, and which questions are now due for review.
import { CheckIcon, RotateCcwIcon, ScaleIcon } from "lucide-react";

import type { ConceptQuest } from "@shared/types/content";
import type { DrillItemResult } from "@shared/types/progress";

/** Props for ConceptResultsSection. */
interface ConceptResultsSectionProps
{
	readonly quest: ConceptQuest;
	readonly results: readonly DrillItemResult[];
}

/** One line per question: right, due for review, or self-checked (not graded). */
export function ConceptResultsSection({ quest, results }: ConceptResultsSectionProps)
{
	return (
		<ul data-testid="concept-results" className="flex flex-col gap-1.5 text-sm">
			{quest.questions.map((question, index) =>
			{
				const correct = results[index]?.correct ?? false;
				const selfChecked = results[index]?.selfChecked === true;

				return (
					<li key={question.id} className="flex items-start gap-2">
						{correct ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-pass" strokeWidth={3} /> : selfChecked ? <ScaleIcon className="mt-0.5 size-4 shrink-0 text-paper-faint" /> : <RotateCcwIcon className="mt-0.5 size-4 shrink-0 text-warn" />}
						<span className={correct ? "text-paper" : "text-paper-muted"}>
							{question.prompt.length > 110 ? `${question.prompt.slice(0, 107)}...` : question.prompt}
							{!correct && (selfChecked ? <span className="text-paper-faint"> Explained in your own words, not graded.</span> : <span className="text-warn"> Due for review.</span>)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
