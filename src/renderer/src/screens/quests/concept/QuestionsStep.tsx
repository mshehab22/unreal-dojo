// The concept quest's recall questions: answer every one, submit once, then each shows its feedback in place.
import { SendIcon } from "lucide-react";

import type { PatternCard, Question } from "@shared/types/content";
import type { DrillItemResult, ItemResponse } from "@shared/types/progress";

import { Panel } from "@/components/Panel";
import { QuestionFeedback } from "@/components/quests/QuestionFeedback";
import { QuestionInput } from "@/components/quests/QuestionInput";
import { Button } from "@/components/ui/button";

/** Props for QuestionsStep. */
interface QuestionsStepProps
{
	readonly questions: readonly Question[];
	readonly answers: readonly (ItemResponse | null)[];
	readonly onAnswer: (index: number, response: ItemResponse | null) => void;
	readonly results: readonly DrillItemResult[] | null;
	readonly onSubmit: () => void;
	readonly isSubmitting: boolean;
	readonly patternCards: readonly PatternCard[];
}

/** One numbered panel per question; Submit once every question has an answer. */
export function QuestionsStep({ questions, answers, onAnswer, results, onSubmit, isSubmitting, patternCards }: QuestionsStepProps)
{
	const answeredCount = answers.filter((answer) => answer !== null).length;
	const isGraded = results !== null;

	return (
		<div data-testid="questions-step" className="flex max-w-3xl flex-col gap-4">
			{questions.map((question, index) =>
			{
				const result = results?.[index];

				return (
					<Panel key={question.id} title={`Question ${index + 1} of ${questions.length}`} testId="concept-question">
						<QuestionInput question={question} response={answers[index] ?? null} onChange={(response) => onAnswer(index, response)} disabled={isGraded || isSubmitting} revealed={isGraded} patternCards={patternCards} />
						{result && <QuestionFeedback question={question} result={result} response={answers[index] ?? null} patternCards={patternCards} />}
					</Panel>
				);
			})}
			{!isGraded && (
				<div className="flex items-center gap-4">
					<Button variant="pack" size="lg" disabled={answeredCount < questions.length || isSubmitting} onClick={onSubmit}>
						<SendIcon />
						{isSubmitting ? "Grading" : "Submit answers"}
					</Button>
					<span className="text-sm text-paper-faint">
						{answeredCount} of {questions.length} answered
					</span>
				</div>
			)}
		</div>
	);
}
