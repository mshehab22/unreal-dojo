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

/** A pick-one question; the answer index must point at one of the choices. */
const multipleChoiceSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("multiple-choice"),
		code: text().optional(),
		choices: textList(1),
		answerIndex: wholeNumber(0),
	})
	.superRefine((question, context) =>
	{
		if (question.answerIndex >= question.choices.length)
		{
			context.addIssue({ code: "custom", path: ["answerIndex"], message: `expected a whole number, 0 to ${question.choices.length - 1}` });
		}
	});

/** A gap-filling question; the prompt must show the gap as ___. */
const fillBlankSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("fill-blank"),
		code: text().optional(),
		acceptedAnswers: textList(1),
	})
	.superRefine((question, context) =>
	{
		if (!question.prompt.includes("___")) context.addIssue({ code: "custom", path: ["prompt"], message: "a fill-blank prompt needs a ___ gap" });
	});

/** A which-pattern question; the answer must be one of the choices. */
const whichPatternSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("which-pattern"),
		choices: textList(1),
		answer: text(),
		distractorNotes: z.array(z.strictObject({ choice: text(), why: text() })).optional(),
	})
	.superRefine((question, context) =>
	{
		if (!question.choices.includes(question.answer)) context.addIssue({ code: "custom", path: ["answer"], message: `"${question.answer}" is not one of the choices` });
	});

/** A find-the-wrong-line question; the bug line must exist in the code. */
const spotTheBugSchema = z
	.strictObject({
		...questionBase,
		type: z.literal("spot-the-bug"),
		code: text(),
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
