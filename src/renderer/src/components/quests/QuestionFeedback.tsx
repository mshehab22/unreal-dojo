// What a graded question taught: right or "due for review", the explanation, the model answer, and the grader's note for explain items.
import { CheckCircle2Icon, RotateCcwIcon } from "lucide-react";

import type { PatternCard, Question } from "@shared/types/content";
import type { DrillItemResult, ItemResponse } from "@shared/types/progress";

import { TermText } from "@/components/TermText";
import { reviewProviderLabel } from "@/lib/reviewProviderLabel";
import { cn } from "@/lib/utils";

/** Props for QuestionFeedback. */
interface QuestionFeedbackProps
{
	readonly question: Question;
	readonly result: DrillItemResult;
	readonly response: ItemResponse | null;
	readonly patternCards?: readonly PatternCard[];
}

/** The verdict line for an explain grade, in the grader's three words. */
const VERDICT_WORDS = { correct: "Correct", partly: "Partly there", incorrect: "Not yet" } as const;

/** The result banner, then explanation, model answer, and notes. A miss reads as due for review, never as a loss. */
export function QuestionFeedback({ question, result, response, patternCards = [] }: QuestionFeedbackProps)
{
	const titles = new Map(patternCards.map((card) => [card.id, card.title]));
	const picked = response?.kind === "choice" ? response.choice : null;
	const distractorNote = question.type === "which-pattern" && picked && picked !== question.answer ? question.distractorNotes.find((note) => note.choice === picked) : undefined;

	return (
		<div data-testid="question-feedback" data-correct={result.correct} className={cn("flex flex-col gap-3 rounded-md border p-4 text-sm", result.correct ? "border-pass/50 bg-pass/5" : "border-warn/50 bg-warn/5")}>
			<div className={cn("flex items-center gap-2 font-medium", result.correct ? "text-pass" : "text-warn")}>
				{result.correct ? <CheckCircle2Icon className="size-4" /> : <RotateCcwIcon className="size-4" />}
				{result.correct ? "Right" : "Due for review: it comes back in your next drill"}
			</div>

			{result.explainGrade && (
				<p className="text-paper-muted">
					<span className="font-medium text-paper">{VERDICT_WORDS[result.explainGrade.verdict]}.</span> {result.explainGrade.note}{" "}
					<span className="text-paper-faint">({reviewProviderLabel(result.explainGrade.provider)})</span>
				</p>
			)}

			{question.type === "which-pattern" && !result.correct && <p className="text-paper-muted">The pattern that fits is <span className="font-medium text-paper">{titles.get(question.answer) ?? question.answer}</span>.</p>}
			{distractorNote && <p className="text-paper-muted">{distractorNote.why}</p>}
			{question.type === "spot-the-bug" && <p className="text-paper-muted"><span className="font-medium text-paper">Fix:</span> {question.fix}</p>}
			{question.type === "fill-blank" && !result.correct && result.modelAnswer && <p className="text-paper-muted">Accepted: <code className="rounded-xs bg-raised px-1 font-mono text-paper">{result.modelAnswer}</code></p>}

			{question.type === "explain-in-one-sentence" && (
				<div className="flex flex-col gap-1">
					<span className="font-mono text-2xs tracking-widest text-paper-faint uppercase">Model answer</span>
					<p data-testid="model-answer" className="text-paper">{question.modelAnswer}</p>
				</div>
			)}

			<TermText markdown={question.explanation} />
		</div>
	);
}
