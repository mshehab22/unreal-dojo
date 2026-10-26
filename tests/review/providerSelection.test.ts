// Provider selection (D11 order in auto, explicit choices, fallback to tests only) and the review service's routing.
import { describe, expect, it } from "vitest";

import { BreakdownGrader } from "../../src/main/services/review/graders/BreakdownGrader";
import { CodeReviewer } from "../../src/main/services/review/graders/CodeReviewer";
import { ExplainGrader } from "../../src/main/services/review/graders/ExplainGrader";
import { FindingExplainer } from "../../src/main/services/review/graders/FindingExplainer";
import { TestsOnlyProvider } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { ProviderSelector } from "../../src/main/services/review/ProviderSelector";
import { unavailableError } from "../../src/main/services/review/reviewErrors";
import { ReviewService } from "../../src/main/services/review/ReviewService";
import { fixedSettings, recorded, sampleBreakdownInput, sampleCodeInput, sampleExplainInput, sampleRun, ScriptedProvider } from "./reviewTestKit";
import type { ReviewProviderSetting } from "@shared/types/settings";

/** Two scripted AI providers with chosen availability. */
function providers(claudeCodeAvailable: boolean, apiAvailable: boolean, replies: string[] = [])
{
	const claudeCode = new ScriptedProvider("claude-code", [...replies], claudeCodeAvailable ? { id: "claude-code", available: true, version: "2.1.304" } : { id: "claude-code", available: false, reason: "Claude Code was not found." });
	const anthropicApi = new ScriptedProvider("anthropic-api", [...replies], apiAvailable ? { id: "anthropic-api", available: true } : { id: "anthropic-api", available: false, reason: "No Anthropic API key is stored." });

	return { claudeCode, anthropicApi };
}

/** A selector over the given availability and choice. */
function selectorFor(choice: ReviewProviderSetting, claudeCodeAvailable: boolean, apiAvailable: boolean): ProviderSelector
{
	const { claudeCode, anthropicApi } = providers(claudeCodeAvailable, apiAvailable);

	return new ProviderSelector(fixedSettings(choice), [claudeCode, anthropicApi], new TestsOnlyProvider());
}

/** The id of whatever the selector picks. */
async function pickedId(selector: ProviderSelector): Promise<string>
{
	return (await selector.select()).provider.id;
}

describe("ProviderSelector", () =>
{
	it("in auto, picks Claude Code, then the API, then tests only", async () =>
	{
		expect(await pickedId(selectorFor("auto", true, true))).toBe("claude-code");
		expect(await pickedId(selectorFor("auto", false, true))).toBe("anthropic-api");
		expect(await pickedId(selectorFor("auto", false, false))).toBe("tests-only");
	});

	it("gives every unavailable provider's reason when it falls back to tests only", async () =>
	{
		const selection = await selectorFor("auto", false, false).select();

		expect(selection).toMatchObject({ kind: "tests-only", reason: "Claude Code was not found. No Anthropic API key is stored." });
	});

	it("honors an explicit choice even when another provider is available", async () =>
	{
		expect(await pickedId(selectorFor("anthropic-api", true, true))).toBe("anthropic-api");
		expect(await pickedId(selectorFor("claude-code", true, true))).toBe("claude-code");
		expect(await pickedId(selectorFor("tests-only", true, true))).toBe("tests-only");
	});

	it("falls back to tests only when the chosen provider is unavailable, without trying the other", async () =>
	{
		const selection = await selectorFor("claude-code", false, true).select();

		expect(selection).toMatchObject({ kind: "tests-only", reason: "Claude Code was not found." });
	});

	it("lists every provider's status, tests only last", async () =>
	{
		const statuses = await selectorFor("auto", true, false).statuses();

		expect(statuses.map((status) => [status.id, status.available])).toEqual([["claude-code", true], ["anthropic-api", false], ["tests-only", true]]);
	});
});

/** A service whose Claude Code provider answers from `replies`. */
function serviceWith(choice: ReviewProviderSetting, replies: string[], claudeCodeAvailable = true)
{
	const { claudeCode, anthropicApi } = providers(claudeCodeAvailable, false, replies);
	const testsOnly = new TestsOnlyProvider();
	const selector = new ProviderSelector(fixedSettings(choice), [claudeCode, anthropicApi], testsOnly);
	const service = new ReviewService(selector, claudeCode, testsOnly, { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() });

	return { service, claudeCode };
}

describe("ReviewService", () =>
{
	it("skips review when the build failed", async () =>
	{
		const { service, claudeCode } = serviceWith("auto", []);

		await expect(service.reviewCode(sampleCodeInput({ run: sampleRun({ compiled: false }) }))).resolves.toBeUndefined();
		expect(claudeCode.requests).toHaveLength(0);
	});

	it("routes each grader to the selected AI provider", async () =>
	{
		const { service, claudeCode } = serviceWith("auto", [recorded("code-review", "good.json"), recorded("breakdown", "good.json"), recorded("explain", "good.json"), recorded("finding", "good.json")]);

		await expect(service.reviewCode(sampleCodeInput())).resolves.toMatchObject({ provider: "claude-code", score: 82 });
		await expect(service.gradeBreakdown(sampleBreakdownInput())).resolves.toMatchObject({ provider: "claude-code", score: 78 });
		await expect(service.gradeExplain(sampleExplainInput())).resolves.toMatchObject({ provider: "claude-code", verdict: "correct" });

		const finding = { severity: "problem" as const, title: "t", detail: "d" };
		await expect(service.explainFinding({ cacheKey: "a:0", brief: "b", finding, files: {} }, { allowPaidApi: true })).resolves.toEqual({ text: expect.stringMatching(/Broadcast/), provider: "claude-code" });

		expect(claudeCode.requests).toHaveLength(4);
	});

	it("routes to tests only when nothing else is available", async () =>
	{
		const { service, claudeCode } = serviceWith("auto", [], false);

		await expect(service.reviewCode(sampleCodeInput())).resolves.toMatchObject({ provider: "tests-only", score: 50 });
		await expect(service.gradeExplain(sampleExplainInput())).resolves.toMatchObject({ provider: "tests-only" });
		expect(claudeCode.requests).toHaveLength(0);
	});

	it("tests Claude Code end to end and reports a sign-in problem as unavailable", async () =>
	{
		const working = serviceWith("auto", ["{\"ok\": true}"]);
		await expect(working.service.testClaudeCode()).resolves.toEqual({ id: "claude-code", available: true, version: "2.1.304" });

		const { claudeCode, anthropicApi } = providers(true, false);
		const signedOut = new ScriptedProvider("claude-code", [unavailableError("Claude Code is not signed in.", "Run claude and /login.") as unknown as Error], { id: "claude-code", available: true, version: "2.1.304" });
		const testsOnly = new TestsOnlyProvider();
		const service = new ReviewService(new ProviderSelector(fixedSettings("auto"), [claudeCode, anthropicApi], testsOnly), signedOut, testsOnly, { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() });

		await expect(service.testClaudeCode()).resolves.toMatchObject({ available: false, reason: "Claude Code is not signed in. Run claude and /login." });
	});
});

describe("TestsOnlyProvider", () =>
{
	const testsOnly = new TestsOnlyProvider();

	it("turns failed tests into problems and rubric lines into self-checks, scored by tests passed", () =>
	{
		const review = testsOnly.reviewCode(sampleCodeInput());

		expect(review.score).toBe(50);
		expect(review.rubric).toEqual([]);
		expect(review.findings[0]).toMatchObject({ severity: "problem", title: "Test failed: BroadcastsChange", detail: expect.stringMatching(/fired 0 times/) });
		expect(review.findings.filter((finding) => finding.title.startsWith("Self-check:"))).toHaveLength(3);
		expect(review.findings.some((finding) => finding.severity === "praise")).toBe(false);
	});

	it("praises a full pass", () =>
	{
		const run = sampleRun({ ok: true, testsPassed: 2, tests: [{ name: "A.B", passed: true }, { name: "A.C", passed: true }] });
		const review = testsOnly.reviewCode(sampleCodeInput({ run }));

		expect(review.score).toBe(100);
		expect(review.findings[0]?.severity).toBe("praise");
	});

	it("matches breakdown labels by name and picks the reference plan that differs most", () =>
	{
		const grade = testsOnly.gradeBreakdown(sampleBreakdownInput({ revisedPlan: { pieces: [{ id: "1", kind: "component", label: "Health Component", purpose: "hp" }, { id: "2", kind: "event", label: "OnDeath Event", purpose: "fires at zero" }], edges: [] } }));

		expect(grade.requiredPiecesCovered).toEqual([
			{ label: "HealthComponent", covered: true, matchedTo: "Health Component" },
			{ label: "OnDeath event", covered: true, matchedTo: "OnDeath Event" },
			{ label: "DoorActor", covered: false },
		]);
		expect(grade.score).toBe(67);
		expect(grade.alternativeToShow).toBe(1);
		expect(grade.concerns).toHaveLength(1);
	});

	it("asks for a self-check against the model answer on explain items", () =>
	{
		expect(testsOnly.gradeExplain(sampleExplainInput())).toMatchObject({ verdict: "partly", note: expect.stringMatching(/^Self-check against the model answer: UPROPERTY registers/) });
	});
});
