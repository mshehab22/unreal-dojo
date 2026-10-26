// One drill item: the right input for its kind, then its feedback once graded. A miss reads as "due for review".
import { CheckCircle2Icon, RotateCcwIcon } from "lucide-react";

import type { DrillItem, PatternCard } from "@shared/types/content";
import type { DrillItemResult, ItemResponse } from "@shared/types/progress";

import { ParsonsInput } from "@/components/quests/ParsonsInput";
import { QuestionFeedback } from "@/components/quests/QuestionFeedback";
import { QuestionInput } from "@/components/quests/QuestionInput";
import { TermText } from "@/components/TermText";
import { formatDue } from "@/lib/formatting";
import { MASTERY_NAMES } from "@/lib/skillNames";
import { cn } from "@/lib/utils";

/** Props for DrillItemView. */
interface DrillItemViewProps
{
	readonly item: DrillItem;
	readonly response: ItemResponse | null;
	readonly onChange: (response: ItemResponse | null) => void;
	readonly result: DrillItemResult | null;
	readonly disabled: boolean;
	readonly patternCards: readonly PatternCard[];
}

/** The item's input, and after grading its feedback and when it comes back. */
export function DrillItemView({ item, response, onChange, result, disabled, patternCards }: DrillItemViewProps)
{
	const revealed = result !== null;

	return (
		<div data-testid="drill-item" data-source={item.source} className="flex flex-col gap-4">
			{item.source === "parsons" ? (
				<>
					<TermText markdown={item.parsons.prompt} className="text-base text-paper" />
					<ParsonsInput block={item.parsons} order={response?.kind === "order" ? response.lineIds : []} onChange={(lineIds) => onChange(lineIds.length > 0 ? { kind: "order", lineIds } : null)} disabled={disabled || revealed} revealed={revealed} />
					{result && (
						<div data-testid="question-feedback" data-correct={result.correct} className={cn("flex items-center gap-2 rounded-md border p-4 text-sm font-medium", result.correct ? "border-pass/50 text-pass" : "border-warn/50 text-warn")}>
							{result.correct ? <CheckCircle2Icon className="size-4" /> : <RotateCcwIcon className="size-4" />}
							{result.correct ? "Right order" : "Due for review: compare with the order that works"}
						</div>
					)}
				</>
			) : (
				<>
					<QuestionInput question={item.question} response={response} onChange={onChange} disabled={disabled || revealed} revealed={revealed} patternCards={patternCards} />
					{result && <QuestionFeedback question={item.question} result={result} response={response} patternCards={patternCards} />}
				</>
			)}
			{result && (
				<p data-testid="next-due-line" className="text-xs text-paper-faint">
					{result.selfChecked ? "Not scheduled: it stays in your drills until a reviewer can grade it." : `Comes back ${formatDue(result.nextDueAt)}.`}
					{!result.selfChecked && result.masteryChange && ` ${MASTERY_NAMES[result.masteryChange.after]} for now, due for review.`}
				</p>
			)}
		</div>
	);
}
