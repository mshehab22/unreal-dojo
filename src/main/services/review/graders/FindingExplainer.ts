// Answers "why is this a finding?" through an AI provider, once per finding: later asks are served from a cache.
import type { ReviewFinding } from "@shared/types/review";

import { parseModelOutput } from "../parsing/parseModelOutput";
import { loadPrompt, type LoadedPrompt } from "../prompts/loadPrompt";
import type { IReviewProvider } from "../providers/IReviewProvider";
import type { FindingExplanationInput } from "../ReviewInputs";
import { findingExplanationOutputSchema, toProviderJsonSchema } from "../ReviewSchemas";
import { limitCodeBlocks } from "./limitCodeBlocks";
import { fileSections, tagged } from "./messageSections";

/** Name used in error messages. */
const GRADER_NAME = "finding explainer";

/** The JSON schema sent with every explanation. */
const FINDING_EXPLANATION_JSON_SCHEMA = toProviderJsonSchema(findingExplanationOutputSchema);

/** Most explanations kept in memory; the oldest goes first. */
const MAXIMUM_CACHED_EXPLANATIONS = 200;

/** Describes one finding as plain lines. */
function findingText(finding: ReviewFinding): string
{
	const location = finding.file ? `${finding.file}${finding.line ? ` line ${finding.line}` : ""}` : "(no file)";

	return [`Severity: ${finding.severity}`, `Title: ${finding.title}`, `Detail: ${finding.detail}`, `Where: ${location}`].join("\n");
}

/** Builds the user message for one explanation. */
export function buildFindingExplanationMessage(input: FindingExplanationInput): string
{
	return [tagged("brief", input.brief), tagged("finding", findingText(input.finding)), `<files>\n${fileSections(input.files)}\n</files>`].join("\n\n");
}

/** Explains findings and caches each answer by the caller's key. */
export class FindingExplainer
{
	/** Explanations already given, by cache key. */
	private readonly cache = new Map<string, string>();

	/** Loads the prompt once. */
	constructor(private readonly prompt: LoadedPrompt = loadPrompt("finding-explainer"))
	{
	}

	/** Answers the cached explanation, or asks the provider once and caches it. */
	async explain(provider: IReviewProvider, input: FindingExplanationInput, signal?: AbortSignal): Promise<string>
	{
		const cached = this.cache.get(input.cacheKey);
		if (cached !== undefined) return cached;

		const rawOutput = await provider.complete({ systemPrompt: this.prompt.text, userMessage: buildFindingExplanationMessage(input), jsonSchema: FINDING_EXPLANATION_JSON_SCHEMA, signal });
		const explanation = limitCodeBlocks(parseModelOutput(GRADER_NAME, findingExplanationOutputSchema, rawOutput).explanation.trim());

		this.remember(input.cacheKey, explanation);

		return explanation;
	}

	/** Stores one explanation, dropping the oldest when the cache is full. */
	private remember(cacheKey: string, explanation: string): void
	{
		if (this.cache.size >= MAXIMUM_CACHED_EXPLANATIONS)
		{
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) this.cache.delete(oldestKey);
		}

		this.cache.set(cacheKey, explanation);
	}
}
