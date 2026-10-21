// The Anthropic API provider with the SDK call mocked: request shape, structured output, refusals, cut-off replies, 429 retry, and error translation.
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { AnthropicApiProvider, type CreateMessage } from "../../src/main/services/review/providers/AnthropicApiProvider";
import { expectAppError, fixedSettings, recorded } from "./reviewTestKit";

/** A recorded-style API message with one text block. */
function messageWith(text: string, stopReason: string = "end_turn", stopDetails: unknown = null): Anthropic.Beta.BetaMessage
{
	return {
		id: "msg_test",
		type: "message",
		role: "assistant",
		model: "claude-sonnet-5-5",
		content: [{ type: "text", text, citations: null }],
		stop_reason: stopReason,
		stop_details: stopDetails,
		stop_sequence: null,
		usage: { input_tokens: 1200, output_tokens: 300 },
	} as unknown as Anthropic.Beta.BetaMessage;
}

/** A 429 as the SDK throws it. */
function rateLimitError(retryAfter?: string): InstanceType<typeof Anthropic.RateLimitError>
{
	const headers = new Headers(retryAfter === undefined ? {} : { "retry-after": retryAfter });

	return new Anthropic.RateLimitError(429, { type: "error", error: { type: "rate_limit_error", message: "slow down" } }, "slow down", headers);
}

/** A scripted SDK call that records its arguments. */
function scriptedSender(results: Array<Anthropic.Beta.BetaMessage | Error>): { send: CreateMessage; calls: Array<{ apiKey: string; parameters: Anthropic.Beta.MessageCreateParamsNonStreaming; signal?: AbortSignal }> }
{
	const calls: Array<{ apiKey: string; parameters: Anthropic.Beta.MessageCreateParamsNonStreaming; signal?: AbortSignal }> = [];

	const send: CreateMessage = async (apiKey, parameters, signal) =>
	{
		calls.push({ apiKey, parameters, signal });

		const result = results.shift();
		if (result === undefined) throw new Error("no scripted result");
		if (result instanceof Error) throw result;

		return result;
	};

	return { send, calls };
}

/** A review request with a tiny schema. */
const REQUEST = { systemPrompt: "Grade the sentence.", userMessage: "Learner sentence.", jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false } };

describe("AnthropicApiProvider", () =>
{
	it("sends the key, model, cached system prompt, and the schema as structured output", async () =>
	{
		const { send, calls } = scriptedSender([messageWith(recorded("explain", "good.json"))]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api"), send);

		const reply = await provider.complete(REQUEST);

		expect(JSON.parse(reply)).toMatchObject({ verdict: "correct" });

		const call = calls[0];
		expect(call?.apiKey).toBe("sk-ant-test-key");
		expect(call?.parameters).toMatchObject({
			model: "claude-sonnet-5-5",
			system: [{ type: "text", text: "Grade the sentence.", cache_control: { type: "ephemeral" } }],
			messages: [{ role: "user", content: "Learner sentence." }],
			output_config: { format: { type: "json_schema", schema: REQUEST.jsonSchema } },
			betas: ["server-side-fallback-2026-07-01"],
			fallbacks: "default",
		});
	});

	it("leaves the refusal fallback off for a model that does not take it", async () =>
	{
		const { send, calls } = scriptedSender([messageWith("{\"ok\":true}")]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api", { modelId: "claude-haiku-5-5" }), send);

		await provider.complete(REQUEST);

		expect(calls[0]?.parameters.betas).toBeUndefined();
		expect(calls[0]?.parameters.fallbacks).toBeUndefined();
	});

	it("turns a refusal stop reason into review-refused with the explanation", async () =>
	{
		const { send } = scriptedSender([messageWith("", "refusal", { type: "refusal", category: "cyber", explanation: "Declined by policy." })]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api"), send);

		const error = await expectAppError(provider.complete(REQUEST), "review-refused");

		expect(error.appError.detail).toBe("Declined by policy.");
	});

	it("turns a reply cut off at max_tokens into review-invalid-output", async () =>
	{
		const { send } = scriptedSender([messageWith(recorded("code-review", "partial-truncated.txt"), "max_tokens")]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api"), send);

		const error = await expectAppError(provider.complete(REQUEST), "review-invalid-output");

		expect(error.appError.message).toMatch(/cut off/);
	});

	it("retries a 429 once after the stated wait", async () =>
	{
		const waits: number[] = [];
		const { send, calls } = scriptedSender([rateLimitError("2"), messageWith("{\"ok\":true}")]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api"), send, async (milliseconds) => { waits.push(milliseconds); });

		await expect(provider.complete(REQUEST)).resolves.toBe("{\"ok\":true}");

		expect(waits).toEqual([2000]);
		expect(calls).toHaveLength(2);
	});

	it("surfaces a second 429, and never retries a 429 without retry-after (the spend cap)", async () =>
	{
		const twice = scriptedSender([rateLimitError("1"), rateLimitError("1")]);
		await expectAppError(new AnthropicApiProvider(fixedSettings("anthropic-api"), twice.send, async () => undefined).complete(REQUEST), "review-unavailable");
		expect(twice.calls).toHaveLength(2);

		const spendCap = scriptedSender([rateLimitError()]);
		const error = await expectAppError(new AnthropicApiProvider(fixedSettings("anthropic-api"), spendCap.send, async () => undefined).complete(REQUEST), "review-unavailable");
		expect(error.appError.message).toMatch(/spend limit/);
		expect(spendCap.calls).toHaveLength(1);
	});

	it("translates a rejected key, a missing model, an abort, and a network failure", async () =>
	{
		const cases: Array<[Error, string, RegExp]> = [
			[new Anthropic.AuthenticationError(401, undefined, "invalid x-api-key", new Headers()), "review-unavailable", /rejected the stored key/],
			[new Anthropic.NotFoundError(404, undefined, "model not found", new Headers()), "review-unavailable", /was not found/],
			[new Anthropic.APIUserAbortError(), "run-cancelled", /cancelled/],
			[new Anthropic.APIConnectionError({ message: "fetch failed" }), "review-unavailable", /could not reach/],
		];

		for (const [sdkError, code, messagePattern] of cases)
		{
			const { send } = scriptedSender([sdkError]);
			const error = await expectAppError(new AnthropicApiProvider(fixedSettings("anthropic-api"), send).complete(REQUEST), code as "review-unavailable");

			expect(error.appError.message).toMatch(messagePattern);
		}
	});

	it("is unavailable without a stored key and never calls the API", async () =>
	{
		const { send, calls } = scriptedSender([]);
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api", { apiKey: null }), send);

		await expect(provider.status()).resolves.toMatchObject({ id: "anthropic-api", available: false, version: "claude-sonnet-5-5" });
		await expectAppError(provider.complete(REQUEST), "review-unavailable");
		expect(calls).toHaveLength(0);
	});
});
