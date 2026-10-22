// M1.7d: Retry review reviews a stored Submit again with no new build, keeps A70, replaces only the stored review, and is reachable over IPC.
import { describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { CodeReview } from "@shared/types/review";
import type { RunRequest, RunResult } from "@shared/types/run";

import { createHandlers, type HandlerDependencies, type ReviewHandlerService } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import { AttemptFileRules, STORED_DETAIL_ATTEMPTS_PER_QUEST } from "../../src/main/services/progress/AttemptFileRules";
import { CUT_OFF_MARK, MAXIMUM_COMPILER_OUTPUT_LENGTH, MAXIMUM_TEST_MESSAGE_LENGTH } from "../../src/main/services/review/reviewInputLimits";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { createReviewHandlers, type ReviewHandlers } from "../../src/main/services/review/createReviewHandlers";
import { BreakdownGrader } from "../../src/main/services/review/graders/BreakdownGrader";
import { CodeReviewer } from "../../src/main/services/review/graders/CodeReviewer";
import { ExplainGrader } from "../../src/main/services/review/graders/ExplainGrader";
import { FindingExplainer } from "../../src/main/services/review/graders/FindingExplainer";
import { TestsOnlyProvider } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { ProviderSelector } from "../../src/main/services/review/ProviderSelector";
import { timeoutError } from "../../src/main/services/review/reviewErrors";
import { API_FAILING_TESTS_REASON, ReviewService } from "../../src/main/services/review/ReviewService";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { FixedClock } from "../support/FixedClock";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";
import { expectAppError, fixedSettings, passingRun, recorded, sampleRun, ScriptedProvider } from "./reviewTestKit";

/** The build quest every test submits. */
const QUEST = { id: "w1.health", title: "Health Component", kind: "build", brief: "Build a health component.", rubric: ["Health lives in a component", "Damage is clamped at zero", "Changes are broadcast through a delegate"], patterns: [] } as unknown as AuthoredQuest;

/** One pack holding the quest, as the content catalog outlines it. */
const PACKS = [{ id: "unreal-foundations", order: 1, worlds: [{ id: "w1", order: 1, quests: [{ id: "w1.health", title: "Health Component", kind: "build", difficulty: 2, xp: 100, order: 1, prerequisites: [], terms: [], patterns: [], skills: [], scaffold: "worked" }] }] }] as unknown as PackOutline[];

/** A submit request. */
const REQUEST: RunRequest = { runId: "run-1", questId: "w1.health", files: { "DojoHealthComponent.cpp": "// source line 1" } };

/** The app's review wiring over scripted providers, a real progress service, and a fake runner answering `run`. */
function wiring(options: { choice?: "auto" | "anthropic-api" | "claude-code"; claudeCode?: ScriptedProvider; anthropicApi?: ScriptedProvider; run?: RunResult } = {})
{
	const claudeCode = options.claudeCode ?? new ScriptedProvider("claude-code", [], { id: "claude-code", available: false, reason: "Claude Code was not found." });
	const anthropicApi = options.anthropicApi ?? new ScriptedProvider("anthropic-api", [], { id: "anthropic-api", available: false, reason: "No key." });
	const testsOnly = new TestsOnlyProvider();
	const graders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };
	const reviewService = new ReviewService(new ProviderSelector(fixedSettings(options.choice ?? "auto"), [claudeCode, anthropicApi], testsOnly), claudeCode, testsOnly, graders);
	const { service: progress, store } = createTestProgressService();
	const runs: RunRequest[] = [];

	const handlers: ReviewHandlers = createReviewHandlers({
		reviewService,
		content: { listPacks: async () => PACKS, getAuthoredQuest: async (questId) => (questId === QUEST.id ? QUEST : undefined), getPatternCards: async () => [] as PatternCard[] },
		progress,
		runQuest: async (request) =>
		{
			runs.push(request);

			return options.run ?? passingRun();
		},
	});

	return { handlers, progress, store, claudeCode, anthropicApi, runs };
}

describe("retryReview", () =>
{
	it("reviews the stored files and run again with no new run, and replaces only the stored review", async () =>
	{
		const claudeCode = new ScriptedProvider("claude-code", [timeoutError("Claude Code took longer than 180 seconds and was stopped."), recorded("code-review", "good.json")], { id: "claude-code", available: true });
		const { handlers, progress, runs } = wiring({ claudeCode });

		const submit = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);
		const before = structuredClone(progress.getProgress());

		expect(submit.review).toMatchObject({ provider: "tests-only", retryReviewSuggested: true });

		const review = await handlers.retryReview(submit.outcome.attempt.attemptId);
		const after = progress.getProgress();

		expect(review).toMatchObject({ provider: "claude-code", score: 82 });
		expect(runs).toHaveLength(1);
		expect(claudeCode.requests).toHaveLength(2);
		expect(claudeCode.requests[1]?.userMessage).toContain("1 | // source line 1");
		expect(claudeCode.requests[1]?.userMessage).toContain("Tests passed: 2 of 2");
		expect(after.attempts).toHaveLength(before.attempts.length);
		expect(after.attempts[0]).toEqual({ ...before.attempts[0], review });
		expect(after.xp).toBe(before.xp);
		expect(after.quests["w1.health"]).toEqual(before.quests["w1.health"]);
	});

	it("reads the same compiler output and test messages as the first review, with the same (cut off) marks, when both are longer than the cut (A744)", async () =>
	{
		const longRun = passingRun();
		longRun.compilerOutput = `\n   ${"warning C4458: declaration hides class member. ".repeat(400)}\n`;
		longRun.tests = [{ name: "Dojo.W1.HealthComponent.TakesDamage", passed: true, message: "note ".repeat(600) }, { name: "Dojo.W1.HealthComponent.BroadcastsChange", passed: true }];
		const claudeCode = new ScriptedProvider("claude-code", [recorded("code-review", "good.json"), recorded("code-review", "good.json")], { id: "claude-code", available: true });
		const { handlers } = wiring({ claudeCode, run: longRun });

		const submit = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);
		await handlers.retryReview(submit.outcome.attempt.attemptId);

		/** One tagged section of a prompt. */
		const section = (message: string | undefined, tag: string): string => message?.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`))?.[0] ?? "";
		const [first, retried] = claudeCode.requests.map((request) => request.userMessage);

		expect(section(first, "compiler_output")).toContain(CUT_OFF_MARK);
		expect(section(first, "test_results")).toContain(CUT_OFF_MARK);
		expect(section(retried, "compiler_output")).toBe(section(first, "compiler_output"));
		expect(section(retried, "test_results")).toBe(section(first, "test_results"));
		expect(retried).toBe(first);
	});

	it("keeps A70 on a retry: the API reviews only all-passed attempts; Claude Code reviews one with failing tests", async () =>
	{
		const failing = sampleRun();
		const api = new ScriptedProvider("anthropic-api", [recorded("code-review", "good.json")], { id: "anthropic-api", available: true });
		const withApi = wiring({ anthropicApi: api, run: failing });
		const apiSubmit = await withApi.handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);

		await expect(withApi.handlers.retryReview(apiSubmit.outcome.attempt.attemptId)).resolves.toMatchObject({ provider: "tests-only", fallbackReason: API_FAILING_TESTS_REASON });
		expect(api.requests).toHaveLength(0);

		const claudeCode = new ScriptedProvider("claude-code", [recorded("code-review", "good.json"), recorded("code-review", "good.json")], { id: "claude-code", available: true });
		const withClaude = wiring({ claudeCode, run: failing });
		const claudeSubmit = await withClaude.handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);

		await expect(withClaude.handlers.retryReview(claudeSubmit.outcome.attempt.attemptId)).resolves.toMatchObject({ provider: "claude-code" });
		expect(claudeCode.requests).toHaveLength(2);
	});

	it("answers a new explanation for a finding after the retry, because the cache key follows the finding", async () =>
	{
		const claudeCode = new ScriptedProvider("claude-code", [
			recorded("code-review", "good.json"),
			"{\"explanation\": \"About the first review.\"}",
			JSON.stringify({ ...JSON.parse(recorded("code-review", "good.json")), findings: [{ severity: "problem", title: "A different first finding", detail: "Changed after the retry." }] }),
			"{\"explanation\": \"About the retried review.\"}",
		], { id: "claude-code", available: true });
		const { handlers } = wiring({ claudeCode });
		const submit = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);
		const attemptId = submit.outcome.attempt.attemptId;

		await expect(handlers.explainFinding({ attemptId, findingIndex: 0 })).resolves.toBe("About the first review.");
		await handlers.retryReview(attemptId);
		await expect(handlers.explainFinding({ attemptId, findingIndex: 0 })).resolves.toBe("About the retried review.");
	});

	it("answers attempt-not-found for an unknown attempt, one without stored code or run, and one that did not compile", async () =>
	{
		const { handlers, progress } = wiring({ run: sampleRun({ compiled: false, ok: false, testsPassed: 0, testsTotal: 0, tests: [] }) });
		const quest = makeQuest({ id: "w1.health", kind: "build" });

		await expectAppError(handlers.retryReview("attempt-9"), "attempt-not-found");

		const old = await progress.recordAttempt({ quest, score: 50, passed: false, compiled: true, isSubmit: true, files: { "A.h": "x" } }, [quest]);
		const oldError = await expectAppError(handlers.retryReview(old.attempt.attemptId), "attempt-not-found");
		expect(oldError.appError.message).toMatch(/no longer stored/);

		const broken = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);
		const brokenError = await expectAppError(handlers.retryReview(broken.outcome.attempt.attemptId), "attempt-not-found");
		expect(brokenError.appError.message).toMatch(/did not compile/);
	});
});

describe("the run stored on Submit attempts", () =>
{
	it("is kept with its compiler output capped, survives a reload, and is pruned with the files and review", async () =>
	{
		const { service, store } = createTestProgressService();
		const quest = makeQuest({ id: "w1.health", kind: "build" });
		const longRun = passingRun();
		longRun.compilerOutput = "w".repeat(MAXIMUM_COMPILER_OUTPUT_LENGTH + 500);

		for (let index = 1; index <= STORED_DETAIL_ATTEMPTS_PER_QUEST + 1; index++) await service.recordAttempt({ quest, score: 100, passed: true, compiled: true, isSubmit: true, files: { "A.h": `${index}` }, run: longRun }, [quest]);
		const notSubmit = await service.recordAttempt({ quest, score: 100, passed: true, compiled: true, isSubmit: false, run: longRun }, [quest]);

		const reloaded = await ProgressService.open(store, new FixedClock(localMoment(2026, 10, 21)), new SequenceRandom([0]));
		const attempts = reloaded.getProgress().attempts;

		expect(attempts[0]?.run).toBeUndefined();
		expect(attempts[1]?.run?.compilerOutput).toHaveLength(MAXIMUM_COMPILER_OUTPUT_LENGTH + 1);
		expect(attempts[1]?.run).toMatchObject({ ok: true, testsPassed: 2, testsTotal: 2, loop: "fast" });
		expect(notSubmit.attempt.run).toBeUndefined();
	});

	it("capRun keeps one character past each review cut, trims the compiler output, and keeps everything else", () =>
	{
		const run = sampleRun({ compilerOutput: `\n\n  ${"c".repeat(MAXIMUM_COMPILER_OUTPUT_LENGTH + 50)}  \n`, tests: [{ name: "A.B", passed: false, message: "m".repeat(5000) }, { name: "A.C", passed: true }] });
		const capped = new AttemptFileRules().capRun(run);

		expect(capped.compilerOutput).toBe("c".repeat(MAXIMUM_COMPILER_OUTPUT_LENGTH + 1));
		expect(capped.tests[0]?.message).toHaveLength(MAXIMUM_TEST_MESSAGE_LENGTH + 1);
		expect(capped.tests[1]).toEqual({ name: "A.C", passed: true });
		expect({ ...capped, tests: [], compilerOutput: "" }).toEqual({ ...run, tests: [], compilerOutput: "" });
		expect(run.tests[0]?.message).toHaveLength(5000);
	});

	it("replaceAttemptReview changes only that attempt's review", async () =>
	{
		const { service } = createTestProgressService();
		const quest = makeQuest({ id: "w1.health", kind: "build" });
		const stored = { files: { "A.h": "x" }, run: passingRun() };
		const first = await service.recordAttempt({ quest, score: 70, passed: true, compiled: true, isSubmit: true, ...stored }, [quest]);
		const second = await service.recordAttempt({ quest, score: 80, passed: true, compiled: true, isSubmit: true, ...stored }, [quest]);
		const review = { provider: "claude-code", summary: "new" } as CodeReview;

		const updated = await service.replaceAttemptReview(first.attempt.attemptId, review);

		expect(updated).toEqual({ ...first.attempt, review });
		expect(service.getProgress().attempts[1]).toEqual(second.attempt);
		await expectAppError(service.replaceAttemptReview("attempt-9", review), "attempt-not-found");
	});

	it("replaceAttemptReview does not write onto an attempt a newer Submit pruned while the retry waited (A745)", async () =>
	{
		const { service } = createTestProgressService();
		const quest = makeQuest({ id: "w1.health", kind: "build" });
		const stored = { files: { "A.h": "x" }, run: passingRun() };
		const oldest = await service.recordAttempt({ quest, score: 70, passed: true, compiled: true, isSubmit: true, ...stored }, [quest]);

		// Five newer Submits prune the oldest to its summary, as one can while a slow retry is waiting on the reviewer.
		for (let index = 0; index < STORED_DETAIL_ATTEMPTS_PER_QUEST; index++) await service.recordAttempt({ quest, score: 70, passed: true, compiled: true, isSubmit: true, ...stored }, [quest]);

		const error = await expectAppError(service.replaceAttemptReview(oldest.attempt.attemptId, { provider: "claude-code", summary: "late" } as CodeReview), "attempt-not-found");

		expect(error.appError.message).toMatch(/no longer stored/);
		expect(service.getProgress().attempts[0]).not.toHaveProperty("review");
	});
});

describe("retryReview over IPC", () =>
{
	it("checks the attempt id and routes to the review handlers", async () =>
	{
		const handlersByChannel = new Map<string, WrappedHandler>();
		const unused = (): never => { throw new Error("not used"); };
		const review = { retryReview: async (attemptId: string) => ({ summary: `retried ${attemptId}` }) } as unknown as ReviewHandlerService;

		registerHandlers({ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) }, createHandlers({
			getAppVersion: () => "1.0.0", getEngineLocator: unused, getContentCatalog: unused, pickFolder: async () => null, progressService: {}, progressContentService: {}, getSandboxService: unused,
			runRegistry: new RunRegistry(), sendProgress: () => undefined, settingsService: {}, readEnvironmentStatus: unused, getReviewHandlers: () => review, getEditorService: unused,
		} as unknown as HandlerDependencies));
		const invoke = (...methodArguments: unknown[]): Promise<IpcResponse<unknown>> => (handlersByChannel.get(IPC_CHANNELS.retryReview) as unknown as (event: object, ...rest: unknown[]) => Promise<IpcResponse<unknown>>)({}, ...methodArguments);

		expect(IPC_CHANNELS.retryReview).toBe("dojo:retryReview");
		expect(await invoke("attempt-3")).toMatchObject({ ok: true, value: { summary: "retried attempt-3" } });
		expect(await invoke("../attempt")).toMatchObject({ ok: false, error: { code: "invalid-payload" } });
	});
});
