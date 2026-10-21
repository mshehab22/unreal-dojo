// Grades a revised breakdown plan through an AI provider and checks that every required piece got an answer.
import type { BreakdownGrade, RequiredPieceCoverage } from "@shared/types/review";

import { parseModelOutput } from "../parsing/parseModelOutput";
import { loadPrompt, type LoadedPrompt } from "../prompts/loadPrompt";
import type { IReviewProvider } from "../providers/IReviewProvider";
import type { BreakdownGradeInput } from "../ReviewInputs";
import { invalidOutputError } from "../reviewErrors";
import { breakdownGradeOutputSchema, toProviderJsonSchema } from "../ReviewSchemas";
import { numberedList, planText, tagged } from "./messageSections";

/** Name used in error messages. */
const GRADER_NAME = "breakdown grader";

/** The JSON schema sent with every breakdown grade. */
const BREAKDOWN_JSON_SCHEMA = toProviderJsonSchema(breakdownGradeOutputSchema);

/** Normalizes a label for matching: lower case, letters and digits only. */
export function normalizeLabel(label: string): string
{
	return label.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Builds the user message for one breakdown grade. */
export function buildBreakdownMessage(input: BreakdownGradeInput): string
{
	const requiredPieces = input.requiredPieces.map((piece) => `[${piece.kind}] ${piece.label}: ${piece.why}`);
	const referencePlans = input.referencePlans.map((plan, index) => `Reference plan ${index}:\n${planText(plan)}`).join("\n\n");

	return [
		tagged("spec", input.spec),
		tagged("required_pieces", numberedList(requiredPieces)),
		tagged("reference_plans", referencePlans),
		tagged("rubric", numberedList(input.rubric)),
		tagged("first_plan", input.firstPlan ? planText(input.firstPlan) : "(not saved)"),
		tagged("revised_plan", planText(input.revisedPlan)),
		tagged("revision_note", input.revisionNote),
	].join("\n\n");
}

/** Asks the provider for a breakdown grade and answers a checked `BreakdownGrade`. */
export class BreakdownGrader
{
	/** Loads the prompt once. */
	constructor(private readonly prompt: LoadedPrompt = loadPrompt("breakdown-grader"))
	{
	}

	/** Grades one revised plan. Throws review-invalid-output when a required piece has no answer or the alternative index is out of range. */
	async grade(provider: IReviewProvider, input: BreakdownGradeInput, signal?: AbortSignal): Promise<BreakdownGrade>
	{
		const rawOutput = await provider.complete({ systemPrompt: this.prompt.text, userMessage: buildBreakdownMessage(input), jsonSchema: BREAKDOWN_JSON_SCHEMA, signal });
		const output = parseModelOutput(GRADER_NAME, breakdownGradeOutputSchema, rawOutput);

		const answersByLabel = new Map(output.requiredPiecesCovered.map((answer) => [normalizeLabel(answer.label), answer]));

		// Answers are put back in the quest's order and wording; a missing answer is an error, never a silent "not covered".
		const coverage: RequiredPieceCoverage[] = input.requiredPieces.map((piece) =>
		{
			const answer = answersByLabel.get(normalizeLabel(piece.label));
			if (!answer) throw invalidOutputError(GRADER_NAME, `it did not say whether the plan covers "${piece.label}".`, rawOutput);

			return answer.covered && answer.matchedTo ? { label: piece.label, covered: true, matchedTo: answer.matchedTo } : { label: piece.label, covered: answer.covered };
		});

		if (output.alternativeToShow >= input.referencePlans.length)
		{
			throw invalidOutputError(GRADER_NAME, `it picked reference plan ${output.alternativeToShow} but the quest has ${input.referencePlans.length}.`, rawOutput);
		}

		return {
			score: Math.round(output.score),
			summary: output.summary.trim(),
			requiredPiecesCovered: coverage,
			concerns: output.concerns.map((concern) => concern.trim()).filter((concern) => concern.length > 0),
			strengths: output.strengths.map((strength) => strength.trim()).filter((strength) => strength.length > 0),
			revisionQuality: Math.round(output.revisionQuality),
			alternativeToShow: output.alternativeToShow,
			provider: provider.id,
		};
	}
}
