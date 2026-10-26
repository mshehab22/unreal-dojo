// Grades the learner's one-sentence answer to a code review's reflection question through an AI provider, reading their own code (A853).
import type { ExplainGrade } from "@shared/types/review";

import { parseModelOutput } from "../parsing/parseModelOutput";
import { loadPrompt, type LoadedPrompt } from "../prompts/loadPrompt";
import type { IReviewProvider } from "../providers/IReviewProvider";
import type { ReflectionGradeInput } from "../ReviewInputs";
import { explainGradeOutputSchema, toProviderJsonSchema } from "../ReviewSchemas";
import { fileSections, tagged } from "./messageSections";

/** Name used in error messages. */
const GRADER_NAME = "reflection grader";

/** The JSON schema sent with every reflection grade: the explain grade's shape. */
const REFLECTION_JSON_SCHEMA = toProviderJsonSchema(explainGradeOutputSchema);

/** Builds the user message for one reflection answer. */
export function buildReflectionMessage(input: ReflectionGradeInput): string
{
	return [
		tagged("question", input.question),
		tagged("review_summary", input.reviewSummary),
		`<files>\n${fileSections(input.files)}\n</files>`,
		tagged("learner_sentence", input.answer.trim().length > 0 ? input.answer : "(empty)"),
	].join("\n\n");
}

/** Asks the provider for a grade on one reflection answer. */
export class ReflectionGrader
{
	/** Loads the prompt once. */
	constructor(private readonly prompt: LoadedPrompt = loadPrompt("reflection-grader"))
	{
	}

	/** Grades one answer. Throws review-invalid-output when the reply does not fit. */
	async grade(provider: IReviewProvider, input: ReflectionGradeInput, signal?: AbortSignal): Promise<ExplainGrade>
	{
		const rawOutput = await provider.complete({ systemPrompt: this.prompt.text, userMessage: buildReflectionMessage(input), jsonSchema: REFLECTION_JSON_SCHEMA, signal });
		const output = parseModelOutput(GRADER_NAME, explainGradeOutputSchema, rawOutput);

		return { score: Math.round(output.score), verdict: output.verdict, note: output.note.trim(), provider: provider.id };
	}
}
