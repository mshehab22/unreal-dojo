// M1.7b: a timeout never moves a review to the paid API, unreadable secure storage falls back, and tests-only matching ignores kind words.
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import type { ReviewProviderSetting } from "@shared/types/settings";

import { BreakdownGrader } from "../../src/main/services/review/graders/BreakdownGrader";
import { CodeReviewer } from "../../src/main/services/review/graders/CodeReviewer";
import { ExplainGrader } from "../../src/main/services/review/graders/ExplainGrader";
import { FindingExplainer } from "../../src/main/services/review/graders/FindingExplainer";
import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { AnthropicApiProvider } from "../../src/main/services/review/providers/AnthropicApiProvider";
import { labelCore, labelMatches, TestsOnlyProvider } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { ProviderSelector } from "../../src/main/services/review/ProviderSelector";
import { timeoutError, unavailableError } from "../../src/main/services/review/reviewErrors";
import { ReviewService } from "../../src/main/services/review/ReviewService";
import { SafeStorageReviewSettings } from "../../src/main/services/review/settings/SafeStorageReviewSettings";
import { expectAppError, fixedSettings, planWithLabels, recorded, sampleBreakdownInput, sampleCodeInput, ScriptedProvider } from "./reviewTestKit";

/** A service over a scripted Claude Code and a given API provider. */
function serviceWith(choice: ReviewProviderSetting, claudeCode: ScriptedProvider, anthropicApi: ScriptedProvider | AnthropicApiProvider)
{
	const testsOnly = new TestsOnlyProvider();
	const selector = new ProviderSelector(fixedSettings(choice), [claudeCode, anthropicApi], testsOnly);
	const graders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };

	return { service: new ReviewService(selector, claudeCode, testsOnly, graders), selector };
}

/** A scripted provider that is available. */
function available(id: "claude-code" | "anthropic-api", replies: Array<string | Error>): ScriptedProvider
{
	return new ScriptedProvider(id, replies, { id, available: true });
}

describe("decision 1: a timeout falls back to tests only, never to the API", () =>
{
	it("Claude Code's timeout is its own error code", () =>
	{
		expect(timeoutError("slow").appError.code).toBe("review-timeout");
		expect(unavailableError("gone", "fix it").appError.code).toBe("review-unavailable");
	});

	it("in auto, a Claude Code timeout gives a tests-only review with the reason and a retry hint, and the API is not called", async () =>
	{
		const claudeCode = available("claude-code", [timeoutError("Claude Code took longer than 180 seconds and was stopped."), recorded("code-review", "good.json")]);
		const anthropicApi = available("anthropic-api", [recorded("code-review", "good.json")]);
		const { service } = serviceWith("auto", claudeCode, anthropicApi);

		const review = await service.reviewCode(sampleCodeInput());

		expect(review).toMatchObject({ provider: "tests-only", retryReviewSuggested: true, fallbackReason: expect.stringMatching(/took longer than 180 seconds.*Retry review/) });
		expect(anthropicApi.requests).toHaveLength(0);

		// Claude Code is not set aside: the retry goes to it again.
		await expect(service.reviewCode(sampleCodeInput())).resolves.toMatchObject({ provider: "claude-code" });
		expect(anthropicApi.requests).toHaveLength(0);
	});

	it("a not-signed-in Claude Code still moves on to the API, with no retry hint", async () =>
	{
		const claudeCode = available("claude-code", [unavailableError("Claude Code is not signed in.", "Run claude and /login.")]);
		const anthropicApi = available("anthropic-api", [recorded("explain", "good.json")]);
		const { service } = serviceWith("auto", claudeCode, anthropicApi);

		const grade = await service.gradeExplain({ prompt: "p", answer: "a" });

		expect(grade.provider).toBe("anthropic-api");
		expect(grade.retryReviewSuggested).toBeUndefined();
	});

	it("an API connection timeout is a review-timeout too", async () =>
	{
		const provider = new AnthropicApiProvider(fixedSettings("anthropic-api"), async () =>
		{
			throw new Anthropic.APIConnectionTimeoutError();
		});

		await expectAppError(provider.complete({ systemPrompt: "s", userMessage: "u", jsonSchema: {} }), "review-timeout");
	});

	it("a timeout during the Settings test does not set Claude Code aside", async () =>
	{
		const claudeCode = new ScriptedProvider("claude-code", [timeoutError("slow"), recorded("explain", "good.json")], { id: "claude-code", available: true, version: "2.1.304" });
		const anthropicApi = available("anthropic-api", []);
		const { service } = serviceWith("auto", claudeCode, anthropicApi);

		await expect(service.testClaudeCode()).resolves.toMatchObject({ available: false, reason: expect.stringMatching(/slow/) });
		await expect(service.gradeExplain({ prompt: "p", answer: "a" })).resolves.toMatchObject({ provider: "claude-code" });
	});
});

describe("decision 2: secure storage that cannot be read never blocks a submit", () =>
{
	/** A real API provider whose key lives in a secure storage that is locked. */
	function lockedKeyApi(): AnthropicApiProvider
	{
		const settings = new SafeStorageReviewSettings({
			currentSettings: () => ({ reviewProvider: "auto", modelId: "claude-sonnet-5-5", hasApiKey: true }),
			loadEncryptedApiKey: async () => Buffer.from("encrypted"),
			decryptor: { isEncryptionAvailable: () => false, decryptString: () => "never" },
		});

		return new AnthropicApiProvider(settings, async () =>
		{
			throw new Error("the API must not be called without a key");
		});
	}

	it("marks the API unavailable with the reason and answers with tests only", async () =>
	{
		const claudeCode = new ScriptedProvider("claude-code", [], { id: "claude-code", available: false, reason: "Claude Code was not found." });
		const { service } = serviceWith("auto", claudeCode, lockedKeyApi());

		const review = await service.reviewCode(sampleCodeInput());

		expect(review).toMatchObject({ provider: "tests-only", fallbackReason: expect.stringContaining("secure storage is not available") });

		const statuses = await service.getProviderStatuses();
		expect(statuses[1]).toMatchObject({ id: "anthropic-api", available: false, reason: expect.stringContaining("secure storage") });
	});

	it("with the API chosen explicitly, still falls back instead of failing", async () =>
	{
		const claudeCode = available("claude-code", []);
		const { service } = serviceWith("anthropic-api", claudeCode, lockedKeyApi());

		await expect(service.gradeBreakdown(sampleBreakdownInput())).resolves.toMatchObject({ provider: "tests-only" });
		expect(claudeCode.requests).toHaveLength(0);
	});

	it("other errors still reach the caller", async () =>
	{
		const claudeCode = available("claude-code", [new AppErrorException("save-failed", "x", "y")]);
		const { service } = serviceWith("auto", claudeCode, available("anthropic-api", []));

		await expectAppError(service.gradeExplain({ prompt: "p", answer: "a" }), "save-failed");
	});
});

describe("decision 3: tests-only matching ignores kind words", () =>
{
	it("takes kind words and one-letter prefixes out of a label's core", () =>
	{
		expect(labelCore("HealthComponent")).toBe("health");
		expect(labelCore("UHealthComponent")).toBe("health");
		expect(labelCore("OnDeath event")).toBe("death");
		expect(labelCore("Wave Manager")).toBe("wave");
		expect(labelCore("Component")).toBe("");
	});

	it("a kind word alone never covers a piece", () =>
	{
		for (const learnerLabel of ["Component", "Actor", "Event", "Manager", "System", "Data", "Step", "Class"])
		{
			expect(labelMatches(learnerLabel, "HealthComponent"), learnerLabel).toBe(false);
			expect(labelMatches(learnerLabel, "WaveManager"), learnerLabel).toBe(false);
		}
	});

	it("a partial match must be at least half the required label's core", () =>
	{
		expect(labelMatches("Health", "HealthComponent")).toBe(true);
		expect(labelMatches("Door", "DoorActor")).toBe(true);
		expect(labelMatches("Wave", "WaveSpawnerSubsystem")).toBe(false);
		expect(labelMatches("Spawner", "WaveSpawnerSubsystem")).toBe(true);
		expect(labelMatches("Heal", "HealthBarWidget")).toBe(false);
		expect(labelMatches("Death", "OnDeath event")).toBe(true);
	});

	it("a plural kind word never covers a piece either", () =>
	{
		const pairs: Array<[string, string]> = [["Steps", "SetupSteps"], ["Systems", "SaveSystems"], ["Classes", "EnemyClasses"], ["Managers", "WaveManagers"], ["Widgets", "HudWidgets"], ["Assets", "LootAssets"], ["Delegates", "DamageDelegates"]];

		for (const [learnerLabel, requiredLabel] of pairs) expect(labelMatches(learnerLabel, requiredLabel), `${learnerLabel} for ${requiredLabel}`).toBe(false);

		expect(labelCore("EnemyClasses")).toBe("enemy");
		expect(labelMatches("Setup", "SetupSteps")).toBe(true);
		expect(labelMatches("SaveSystems", "SaveSystems")).toBe(true);
	});

	it("a plan of kind words scores zero", () =>
	{
		const grade = new TestsOnlyProvider().gradeBreakdown(sampleBreakdownInput({ revisedPlan: planWithLabels(["Component", "Event", "Actor"]) }));

		expect(grade.requiredPiecesCovered.every((piece) => !piece.covered)).toBe(true);
		expect(grade.score).toBe(0);
	});
});
