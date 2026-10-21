// Reads one question of any type from parsed YAML or JSON (concept quests and pattern cards share this).
import type { DistractorNote, Question, QuestionType } from "@shared/types/content";

import type { ObjectReader } from "./ObjectReader";

/** Every question type, in the order they are listed in error messages. */
export const QUESTION_TYPES: readonly QuestionType[] = [
	"multiple-choice",
	"fill-blank",
	"which-pattern",
	"spot-the-bug",
	"explain-in-one-sentence",
];

/** Reads one `{ choice, why }` note on a which-pattern question. */
function readDistractorNote(reader: ObjectReader): DistractorNote
{
	return { choice: reader.string("choice"), why: reader.string("why") };
}

/** Adds `code` to a question only when the author wrote one, so absent stays absent. */
function withOptionalCode<Shape extends object>(question: Shape, reader: ObjectReader): Shape & { code?: string }
{
	const code = reader.optionalString("code");

	return code === undefined ? question : { ...question, code };
}

/** Reads a question, choosing the fields by its `type`. The caller calls `reader.finish()`. */
export function readQuestion(reader: ObjectReader): Question
{
	const id = reader.string("id");
	const type = reader.oneOf("type", QUESTION_TYPES);
	const prompt = reader.string("prompt");

	switch (type)
	{
		case "multiple-choice":
		{
			const choices = reader.stringList("choices", false);
			const answerIndex = reader.integer("answerIndex", 0, Math.max(0, choices.length - 1));
			const explanation = reader.string("explanation");

			return withOptionalCode({ id, type, prompt, choices, answerIndex, explanation }, reader);
		}

		case "fill-blank":
		{
			if (!prompt.includes("___")) reader.report("prompt", "a fill-blank prompt needs a ___ gap");

			const acceptedAnswers = reader.stringList("acceptedAnswers", false);
			const explanation = reader.string("explanation");

			return withOptionalCode({ id, type, prompt, acceptedAnswers, explanation }, reader);
		}

		case "which-pattern":
		{
			const choices = reader.stringList("choices", false);
			const answer = reader.string("answer");

			if (answer && choices.length > 0 && !choices.includes(answer)) reader.report("answer", `"${answer}" is not one of the choices`);

			const distractorNotes = reader.optionalObjectList("distractorNotes", readDistractorNote);
			const explanation = reader.string("explanation");
			const question = { id, type, prompt, choices, answer, explanation };

			return distractorNotes === undefined ? question : { ...question, distractorNotes };
		}

		case "spot-the-bug":
		{
			const code = reader.string("code");
			const lineCount = code.split("\n").length;
			const bugLine = reader.integer("bugLine", 1, lineCount);
			const fix = reader.string("fix");
			const explanation = reader.string("explanation");

			return { id, type, prompt, code, bugLine, fix, explanation };
		}

		case "explain-in-one-sentence":
		{
			const modelAnswer = reader.string("modelAnswer");
			const rubric = reader.stringList("rubric", false);
			const explanation = reader.string("explanation");

			return withOptionalCode({ id, type, prompt, modelAnswer, rubric, explanation }, reader);
		}
	}
}
