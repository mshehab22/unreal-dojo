// zod schemas for every question type, shared by concept quests and pattern cards.
import { z } from "zod";

import type { Question } from "@shared/types/content";

import { text, textList, wholeNumber } from "./schemaHelpers";

/** Fields every question type has. */
const questionBase = {
	id: text(),
	prompt: text(),
	explanation: text(),
};

/** A pick-one question with at least two choices; the answer index must point at one of them. */
const multipleChoiceSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("multiple-choice"),
		code: text().optional(),
		choices: textList(2),
		answerIndex: wholeNumber(0),
	})
	.superRefine((question, context) =>
	{
		if (question.answerIndex >= question.choices.length)
		{
			context.addIssue({ code: "custom", path: ["answerIndex"], message: `expected a whole number, 0 to ${question.choices.length - 1}` });
		}
	});

/** A gap-filling question; the prompt must show exactly one gap as ___. */
const fillBlankSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("fill-blank"),
		code: text().optional(),
		acceptedAnswers: textList(1),
	})
	.superRefine((question, context) =>
	{
		const gapCount = question.prompt.split("___").length - 1;

		if (gapCount !== 1) context.addIssue({ code: "custom", path: ["prompt"], message: `a fill-blank prompt needs exactly one ___ gap (found ${gapCount})` });
	});

/** A which-pattern question; the answer must be one of the choices, and wrong choices carry notes. */
const whichPatternSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("which-pattern"),
		choices: textList(1),
		answer: text(),
		distractorNotes: z.array(z.strictObject({ choice: text(), why: text() })).min(1),
	})
	.superRefine((question, context) =>
	{
		if (!question.choices.includes(question.answer)) context.addIssue({ code: "custom", path: ["answer"], message: `"${question.answer}" is not one of the choices` });
	});

/** Drops blank lines before the code and whitespace after it, so line numbers match what the learner sees. */
function trimCode(code: string): string
{
	return code.replace(/^(?:[ \t]*\r?\n)+/, "").trimEnd();
}

/** A find-the-wrong-line question; the bug line must exist in the trimmed code. */
const spotTheBugSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("spot-the-bug"),
		code: text().transform(trimCode),
		bugLine: wholeNumber(1),
		fix: text(),
	})
	.superRefine((question, context) =>
	{
		const lineCount = question.code.split("\n").length;

		if (question.bugLine > lineCount) context.addIssue({ code: "custom", path: ["bugLine"], message: `expected a whole number, 1 to ${lineCount}` });
	});

/** A one-sentence answer graded against a rubric. */
const explainSchema = z.strictObject({
	...questionBase,
	type: z.literal("explain-in-one-sentence"),
	code: text().optional(),
	modelAnswer: text(),
	rubric: textList(1),
});

/** Any question, chosen by its `type`. */
export const questionSchema: z.ZodType<Question> = z.discriminatedUnion("type", [
	multipleChoiceSchema,
	fillBlankSchema,
	whichPatternSchema,
	spotTheBugSchema,
	explainSchema,
]);
