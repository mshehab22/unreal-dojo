// Grades one answer to a concept question or drill item in the main process, so answer keys never decide anything in the renderer.
import type { DrillItem, ExplainInOneSentenceQuestion, ParsonsBlock, Question } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

/** An answer graded on the spot, or an explain item that needs the explain grader. */
export type ItemGrade =
	| { kind: "graded"; correct: boolean; modelAnswer: string }
	| { kind: "needs-explain-grader"; question: ExplainInOneSentenceQuestion; answer: string };

/** Prefix of the line ids the renderer sends for a Parsons block's correct lines (`line-0`, `line-1`, ...) (A314). */
export const PARSONS_LINE_PREFIX = "line-";

/** Prefix of the line ids for a Parsons block's distractor lines (`distractor-0`, ...). */
export const PARSONS_DISTRACTOR_PREFIX = "distractor-";

/** Lower-cases, trims, and collapses spaces, so "  UPROPERTY " and "uproperty" match (A315). */
function normalize(text: string): string
{
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Grading rules per question type. Pure: no I/O. */
export class ItemGrader
{
	/** Grades an answer to a drill item. */
	gradeItem(item: DrillItem, response: ItemResponse): ItemGrade
	{
		if (item.source === "parsons") return this.gradeParsons(item.parsons, response);

		return this.gradeQuestion(item.question, response);
	}

	/** Grades an answer to one question. A response of the wrong kind is wrong. */
	gradeQuestion(question: Question, response: ItemResponse): ItemGrade
	{
		switch (question.type)
		{
			case "multiple-choice":
			{
				const rightChoice = question.choices[question.answerIndex] ?? "";
				const correct = response.kind === "choice" && (response.choice === String(question.answerIndex) || response.choice === rightChoice);

				return { kind: "graded", correct, modelAnswer: rightChoice };
			}
			case "fill-blank":
			{
				const correct = response.kind === "text" && question.acceptedAnswers.some((accepted) => normalize(accepted) === normalize(response.text));

				return { kind: "graded", correct, modelAnswer: question.acceptedAnswers[0] ?? "" };
			}
			case "which-pattern":
				return { kind: "graded", correct: response.kind === "choice" && response.choice === question.answer, modelAnswer: question.answer };
			case "spot-the-bug":
				return { kind: "graded", correct: response.kind === "choice" && response.choice === String(question.bugLine), modelAnswer: question.fix };
			case "explain-in-one-sentence":
				return { kind: "needs-explain-grader", question, answer: response.kind === "text" ? response.text : "" };
		}
	}

	/** A Parsons answer is right when its lines, read through their ids, are exactly the block's lines in order, with no distractor. Identical lines may swap. */
	gradeParsons(block: ParsonsBlock, response: ItemResponse): ItemGrade
	{
		const modelAnswer = block.lines.join("\n");
		if (response.kind !== "order") return { kind: "graded", correct: false, modelAnswer };

		const texts = response.lineIds.map((lineId) => (lineId.startsWith(PARSONS_LINE_PREFIX) ? block.lines[Number(lineId.slice(PARSONS_LINE_PREFIX.length))] : undefined));
		const correct = texts.length === block.lines.length && texts.every((text, index) => text !== undefined && text === block.lines[index]);

		return { kind: "graded", correct, modelAnswer };
	}
}
