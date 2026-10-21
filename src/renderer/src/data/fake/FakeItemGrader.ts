// Grades concept answers and drill items in the fake the way progress-and-rules does (A314, A315), so screens see realistic results.
import type { DrillItem, ParsonsBlock, Question } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

/** One graded answer: right or not, the model answer, and for explain items the sentence still to grade. */
export interface FakeItemGrade
{
	correct: boolean;
	modelAnswer: string;
	explainAnswer?: string;
}

/** Lower-cases, trims, and collapses spaces. */
function normalize(text: string): string
{
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Grades an answer to one question. Explain answers are marked for the explain grader. */
export function gradeQuestion(question: Question, response: ItemResponse | null): FakeItemGrade
{
	switch (question.type)
	{
		case "multiple-choice":
		{
			const rightChoice = question.choices[question.answerIndex] ?? "";
			const correct = response?.kind === "choice" && (response.choice === String(question.answerIndex) || response.choice === rightChoice);

			return { correct, modelAnswer: rightChoice };
		}
		case "fill-blank":
			return { correct: response?.kind === "text" && question.acceptedAnswers.some((accepted) => normalize(accepted) === normalize(response.text)), modelAnswer: question.acceptedAnswers[0] ?? "" };
		case "which-pattern":
			return { correct: response?.kind === "choice" && response.choice === question.answer, modelAnswer: question.answer };
		case "spot-the-bug":
			return { correct: response?.kind === "choice" && response.choice === String(question.bugLine), modelAnswer: question.fix };
		case "explain-in-one-sentence":
			return { correct: false, modelAnswer: question.modelAnswer, explainAnswer: response?.kind === "text" ? response.text : "" };
	}
}

/** Grades a Parsons order: right when the named lines read exactly as the block, with no distractor (A314). */
export function gradeParsons(block: ParsonsBlock, response: ItemResponse): FakeItemGrade
{
	const modelAnswer = block.lines.join("\n");

	if (response.kind !== "order") return { correct: false, modelAnswer };

	const texts = response.lineIds.map((lineId) => (lineId.startsWith("line-") ? block.lines[Number(lineId.slice("line-".length))] : undefined));
	const correct = texts.length === block.lines.length && texts.every((text, index) => text !== undefined && text === block.lines[index]);

	return { correct, modelAnswer };
}

/** Grades an answer to a drill item of any source. */
export function gradeDrillItem(item: DrillItem, response: ItemResponse): FakeItemGrade
{
	return item.source === "parsons" ? gradeParsons(item.parsons, response) : gradeQuestion(item.question, response);
}
