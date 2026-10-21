// The transport contract every AI review provider fulfils. Graders build prompts and parse JSON; providers only carry text there and back.
import type { ReviewProviderId, ReviewProviderStatus } from "@shared/types/review";

import type { JsonSchemaObject } from "../ReviewSchemas";

/** One request to a model: the system prompt, the user message, and the JSON schema the reply must follow. */
export interface ReviewCompletionRequest
{
	/** The grader's system prompt. */
	systemPrompt: string;

	/** The per-quest message with the learner's work in it. */
	userMessage: string;

	/** The JSON schema the reply must match. */
	jsonSchema: JsonSchemaObject;

	/** Aborts the request when the learner cancels. */
	signal?: AbortSignal;
}

/** An AI provider that can take a review: Claude Code or the Anthropic API. */
export interface IReviewProvider
{
	/** Which provider this is. */
	readonly id: ReviewProviderId;

	/** Says whether the provider can take a review now. Cached; `refresh` checks again. */
	status(refresh?: boolean): Promise<ReviewProviderStatus>;

	/** Sends one request and answers the model's raw reply (JSON text). Throws an AppErrorException on failure, refusal, timeout, or cancel. */
	complete(request: ReviewCompletionRequest): Promise<string>;
}
