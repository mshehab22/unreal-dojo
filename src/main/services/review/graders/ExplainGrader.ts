// Grades one learner sentence (an explain-in-one-sentence item or a reflection answer) through an AI provider.
import type { ExplainGrade } from "@shared/types/review";

import { parseModelOutput } from "../parsing/parseModelOutput";
import { loadPrompt, type LoadedPrompt } from "../prompts/loadPrompt";
import type { IReviewProvider } from "../providers/IReviewProvider";
import type { ExplainGradeInput } from "../ReviewInputs";
import { explainGradeOutputSchema, toProviderJsonSchema } from "../ReviewSchemas";
import { numberedList, tagged } from "./messageSections";

/** Name used in error messages. */
const GRADER_NAME = "explain grader";

/** The JSON schema sent with every explain grade. */
const EXPLAIN_JSON_SCHEMA = toProviderJsonSchema(explainGradeOutputSchema);

/** Builds the user message for one sentence. */
export function buildExplainMessage(input: ExplainGradeInput): string
{
	const sections = [tagged("question", input.prompt), tagged("model_answer", input.modelAnswer ?? "(none: judge against the question and context)")];

	if (input.rubric && input.rubric.length > 0) sections.push(tagged("rubric", numberedList(input.rubric)));
	if (input.context) sections.push(tagged("context", input.context));

	sections.push(tagged("learner_sentence", input.answer.trim().length > 0 ? input.answer : "(empty)"));

	return sections.join("\n\n");
}

/** Asks the provider for a grade on one sentence. */
export class ExplainGrader
{
	/** Loads the prompt once. */
	constructor(private readonly prompt: LoadedPrompt = loadPrompt("explain-grader"))
	{
	}

	/** Grades one sentence. Throws review-invalid-output when the reply does not fit. */
	async grade(provider: IReviewProvider, input: ExplainGradeInput, signal?: AbortSignal): Promise<ExplainGrade>
	{
		const rawOutput = await provider.complete({ systemPrompt: this.prompt.text, userMessage: buildExplainMessage(input), jsonSchema: EXPLAIN_JSON_SCHEMA, signal });
		const output = parseModelOutput(GRADER_NAME, explainGradeOutputSchema, rawOutput);

		return { score: Math.round(output.score), verdict: output.verdict, note: output.note.trim(), provider: provider.id };
	}
}
