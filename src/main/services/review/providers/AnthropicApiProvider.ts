// Reviews through the Anthropic Messages API with the learner's own key, using structured output so the reply follows the grader's schema.
import Anthropic from "@anthropic-ai/sdk";

import type { ReviewProviderStatus } from "@shared/types/review";

import { cancelledError, invalidOutputError, refusedError, unavailableError } from "../reviewErrors";
import type { IReviewSettings } from "../settings/IReviewSettings";
import type { IReviewProvider, ReviewCompletionRequest } from "./IReviewProvider";

/** Output budget for one review. A review is about 800 tokens; the rest is room for thinking. Below the SDK's non-streaming limit. */
const MAXIMUM_OUTPUT_TOKENS = 16_000;

/** Milliseconds one API call may take. */
const REQUEST_TIMEOUT_MS = 120_000;

/** Longest `retry-after` the provider waits through before giving up on a 429. */
const MAXIMUM_RETRY_WAIT_SECONDS = 60;

/** Models that take the server-side refusal fallback in its `default` form (claude-api skill, refusal fallbacks). */
const MODELS_WITH_DEFAULT_FALLBACK = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

/** Beta flag for `fallbacks: "default"`. */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Name used in every message about this provider. */
const PROVIDER_NAME = "The Anthropic API";

/** Sends one Messages API request. Replaced in tests; the default builds an SDK client per key. */
export type CreateMessage = (apiKey: string, parameters: Anthropic.Beta.MessageCreateParamsNonStreaming, signal?: AbortSignal) => Promise<Anthropic.Beta.BetaMessage>;

/** Waits a number of milliseconds. Replaced in tests so a retry does not slow them down. */
export type Wait = (milliseconds: number) => Promise<void>;

/** The real SDK call. Retries are off because the provider does its own single 429 retry. */
export function createSdkMessageSender(): CreateMessage
{
	const clientsByKey = new Map<string, Anthropic>();

	return (apiKey, parameters, signal) =>
	{
		let client = clientsByKey.get(apiKey);

		if (!client)
		{
			clientsByKey.clear();
			client = new Anthropic({ apiKey, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });
			clientsByKey.set(apiKey, client);
		}

		return client.beta.messages.create(parameters, { signal });
	};
}

/** Waits with a real timer. */
function waitWithTimer(milliseconds: number): Promise<void>
{
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Reads the seconds in a 429's `retry-after` header, or null when it is missing (the spend cap 429 has none and must not be retried). */
function retryAfterSeconds(error: InstanceType<typeof Anthropic.RateLimitError>): number | null
{
	const header = error.headers?.get("retry-after");
	if (header === null || header === undefined) return null;

	const seconds = Number(header);

	return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** Reviews through the API with the key from settings. */
export class AnthropicApiProvider implements IReviewProvider
{
	/** Which provider this is. */
	readonly id = "anthropic-api" as const;

	/** Keeps the settings and the request function, which tests replace. */
	constructor(private readonly settings: IReviewSettings, private readonly createMessage: CreateMessage = createSdkMessageSender(), private readonly wait: Wait = waitWithTimer)
	{
	}

	/** Available whenever a key is stored. The key is not sent anywhere to check it; a bad key shows on the first review. */
	async status(): Promise<ReviewProviderStatus>
	{
		const version = this.settings.modelId();
		if (!this.settings.hasApiKey()) return { id: this.id, available: false, version, reason: "No Anthropic API key is stored. Add one in Settings." };

		return { id: this.id, available: true, version };
	}

	/** Sends the review and answers the reply's text. Retries a 429 once after the wait the API asked for. */
	async complete(request: ReviewCompletionRequest): Promise<string>
	{
		const apiKey = await this.settings.readApiKey();
		if (apiKey === null) throw unavailableError("No Anthropic API key is stored.", "Add your key in Settings, or pick another review provider.");

		const parameters = this.buildParameters(request);

		try
		{
			return this.readReply(await this.createMessage(apiKey, parameters, request.signal));
		}
		catch (error)
		{
			if (!(error instanceof Anthropic.RateLimitError)) throw this.translateError(error);

			const seconds = retryAfterSeconds(error);
			if (seconds === null || seconds > MAXIMUM_RETRY_WAIT_SECONDS) throw this.translateError(error);

			await this.wait(seconds * 1000);
			if (request.signal?.aborted) throw cancelledError();

			try
			{
				return this.readReply(await this.createMessage(apiKey, parameters, request.signal));
			}
			catch (retryError)
			{
				throw this.translateError(retryError);
			}
		}
	}

	/** Builds the Messages API request: cached system prompt, the user message, and the schema as structured output. */
	private buildParameters(request: ReviewCompletionRequest): Anthropic.Beta.MessageCreateParamsNonStreaming
	{
		const model = this.settings.modelId();
		const parameters: Anthropic.Beta.MessageCreateParamsNonStreaming = {
			model,
			max_tokens: MAXIMUM_OUTPUT_TOKENS,
			system: [{ type: "text", text: request.systemPrompt, cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: request.userMessage }],
			output_config: { format: { type: "json_schema", schema: request.jsonSchema } },
		};

		if (MODELS_WITH_DEFAULT_FALLBACK.has(model))
		{
			parameters.betas = [FALLBACK_BETA];
			parameters.fallbacks = "default";
		}

		return parameters;
	}

	/** Checks the stop reason and joins the text blocks. */
	private readReply(message: Anthropic.Beta.BetaMessage): string
	{
		const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");

		if (message.stop_reason === "refusal") throw refusedError(PROVIDER_NAME, message.stop_details?.explanation ?? undefined);
		if (message.stop_reason === "max_tokens") throw invalidOutputError("reviewer", "the reply was cut off before it finished.", text);

		return text;
	}

	/** Turns an SDK error into the AppError the learner sees. AppErrors already made by this provider pass through. */
	private translateError(error: unknown): Error
	{
		if (error instanceof Anthropic.APIUserAbortError) return cancelledError();
		if (error instanceof Anthropic.AuthenticationError) return unavailableError("The Anthropic API rejected the stored key.", "Check the key in Settings, or enter a new one.", error.message);
		if (error instanceof Anthropic.PermissionDeniedError) return unavailableError("This API key cannot use the chosen model.", "Pick another model in Settings, or check the key's workspace.", error.message);
		if (error instanceof Anthropic.NotFoundError) return unavailableError(`The model "${this.settings.modelId()}" was not found.`, "Pick another model in Settings.", error.message);
		if (error instanceof Anthropic.RateLimitError) return unavailableError("The Anthropic API is rate limiting this key, or its spend limit was reached.", "Wait a minute and submit again, or check the key's limits in the Claude Console.", error.message);
		if (error instanceof Anthropic.APIConnectionError) return unavailableError("The app could not reach the Anthropic API.", "Check your internet connection and submit again.", error.message);
		if (error instanceof Anthropic.APIError) return unavailableError("The Anthropic API returned an error.", "Submit again in a moment.", error.message);
		if (error instanceof Error) return error;

		return unavailableError("The Anthropic API call failed.", "Submit again in a moment.", String(error));
	}
}
