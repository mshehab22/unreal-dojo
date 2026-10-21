// M1.7c: Submit (run, review, record), the code attempt score, the finding and reflection follow-ups, and the review IPC routing.
import { describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { AttemptOutcome, AttemptRecord } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";
import type { BuildProgressEvent, RunRequest } from "@shared/types/run";

import { createHandlers, type HandlerDependencies, type ReviewHandlerService } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type IpcHandleRegistrar, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import type { AttemptInput } from "../../src/main/services/progress/ProgressService";
import { AttemptReviewService } from "../../src/main/services/review/AttemptReviewService";
import { CodeAttemptRecorder } from "../../src/main/services/review/CodeAttemptRecorder";
import { codeReviewInputFrom, isReviewedCodeQuest, type ReviewedCodeQuest } from "../../src/main/services/review/codeReviewInputFrom";
import { QuestSubmitService, type CodeAttemptSubmission } from "../../src/main/services/review/QuestSubmitService";
import type { CodeReviewInput, ExplainGradeInput, FindingExplanationInput } from "../../src/main/services/review/ReviewInputs";
import type { ProgressUpdate } from "../../src/main/services/unreal/ProgressUpdate";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { BreakdownGrader } from "../../src/main/services/review/graders/BreakdownGrader";
import { CodeReviewer } from "../../src/main/services/review/graders/CodeReviewer";
import { ExplainGrader } from "../../src/main/services/review/graders/ExplainGrader";
import { FindingExplainer } from "../../src/main/services/review/graders/FindingExplainer";
import { createReviewHandlers } from "../../src/main/services/review/createReviewHandlers";
import { TestsOnlyProvider } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { ProviderSelector } from "../../src/main/services/review/ProviderSelector";
import { ReviewService } from "../../src/main/services/review/ReviewService";
import { createTestProgressService } from "../support/progressFixtures";
import { CUT_OFF_NOTE, MAXIMUM_STORED_FILE_LENGTH, STORED_DETAIL_ATTEMPTS_PER_QUEST } from "../../src/main/services/progress/AttemptFileRules";
import { refusedError } from "../../src/main/services/review/reviewErrors";
import { API_FAILING_TESTS_REASON } from "../../src/main/services/review/ReviewService";
import { makeQuest } from "../support/progressFixtures";
import { expectAppError, fixedSettings, passingRun, recorded, sampleCodeInput, sampleRun, ScriptedProvider } from "./reviewTestKit";

/** A build quest with the fields the review reads. */
function buildQuest(overrides: Partial<ReviewedCodeQuest> = {}): ReviewedCodeQuest
{
	return {
		id: "w1.health",
		title: "Health Component",
		kind: "build",
		brief: "Build a health component.",
		rubric: ["Health lives in a component", "Changes are broadcast"],
		patterns: ["observer", "unknown-pattern"],
		...overrides,
	} as unknown as ReviewedCodeQuest;
}

/** The Observer pattern card. */
const PATTERN_CARDS = [{ id: "observer", title: "Observer" }] as unknown as PatternCard[];

/** A code review from the given provider. */
function codeReview(provider: CodeReview["provider"], score = 90): CodeReview
{
	return {
		score,
		summary: "Clean split.",
		rubric: [],
		findings: [{ severity: "problem", title: "No broadcast", detail: "TakeDamage never broadcasts.", file: "Health.cpp", line: 3 }],
		reflectionQuestion: "Why a delegate?",
		alternativeHint: "",
		provider,
	};
}

/** A submit request. */
const REQUEST: RunRequest = { runId: "run-1", questId: "w1.health", files: { "Health.cpp": "// code" } };

/** An outcome stand-in; only identity matters to these tests. */
const OUTCOME = { questId: "w1.health" } as unknown as AttemptOutcome;

/** A Submit service over scripted steps, recording what each step received. */
function submitServiceWith(options: { quest?: AuthoredQuest; compiled?: boolean; review?: CodeReview; abortAfterRun?: AbortController } = {})
{
	const calls = { reviewInputs: [] as CodeReviewInput[], recorded: [] as CodeAttemptSubmission[], progress: [] as ProgressUpdate[] };
	const service = new QuestSubmitService({
		getAuthoredQuest: async (questId) => (questId === "w1.health" ? (options.quest ?? buildQuest()) : undefined),
		getPatternCards: async () => PATTERN_CARDS,
		runQuest: async (_request, onProgress) =>
		{
			onProgress({ phase: "testing", lastLine: "Running tests" });
			options.abortAfterRun?.abort();

			return sampleRun({ compiled: options.compiled ?? true });
		},
		reviewCode: async (input) =>
		{
			calls.reviewInputs.push(input);

			return options.review ?? codeReview("claude-code");
		},
		recordCodeAttempt: async (submission) =>
		{
			calls.recorded.push(submission);

			return OUTCOME;
		},
	});

	return { service, calls, onProgress: (update: ProgressUpdate) => calls.progress.push(update) };
}

describe("QuestSubmitService", () =>
{
	it("runs, reviews with the quest's rubric and pattern titles, records with the files, and answers run, review, and outcome", async () =>
	{
		const { service, calls, onProgress } = submitServiceWith();

		const outcome = await service.submit(REQUEST, onProgress, new AbortController().signal);

		expect(outcome).toEqual({ run: expect.objectContaining({ compiled: true }), review: codeReview("claude-code"), outcome: OUTCOME });
		expect(calls.reviewInputs[0]).toMatchObject({ questId: "w1.health", rubric: ["Health lives in a component", "Changes are broadcast"], patternNames: ["Observer", "unknown-pattern"], files: REQUEST.files });
		expect(calls.recorded[0]).toMatchObject({ questId: "w1.health", review: codeReview("claude-code"), files: REQUEST.files });
		expect(calls.progress.map((update) => update.phase)).toEqual(["testing", "reviewing"]);
	});

	it("skips the review when the build failed and still records the attempt", async () =>
	{
		const { service, calls, onProgress } = submitServiceWith({ compiled: false });

		const outcome = await service.submit(REQUEST, onProgress, new AbortController().signal);

		expect(outcome.review).toBeUndefined();
		expect(calls.reviewInputs).toHaveLength(0);
		expect(calls.recorded).toHaveLength(1);
		expect(calls.progress.some((update) => update.phase === "reviewing")).toBe(false);
	});

	it("records nothing when the learner cancels", async () =>
	{
		const controller = new AbortController();
		const { service, calls, onProgress } = submitServiceWith({ abortAfterRun: controller });

		await expectAppError(service.submit(REQUEST, onProgress, controller.signal), "run-cancelled");
		expect(calls.recorded).toHaveLength(0);
	});

	it("refuses an unknown quest and a quest that is not build or refactor", async () =>
	{
		await expectAppError(submitServiceWith().service.submit({ ...REQUEST, questId: "nope" }, () => undefined, new AbortController().signal), "quest-not-found");

		const concept = { id: "w1.health", kind: "concept" } as unknown as AuthoredQuest;
		await expectAppError(submitServiceWith({ quest: concept }).service.submit(REQUEST, () => undefined, new AbortController().signal), "invalid-payload");
	});
});

describe("codeReviewInputFrom", () =>
{
	it("accepts build and refactor quests only", () =>
	{
		expect(isReviewedCodeQuest(buildQuest())).toBe(true);
		expect(isReviewedCodeQuest(buildQuest({ kind: "refactor" } as Partial<ReviewedCodeQuest>))).toBe(true);
		expect(isReviewedCodeQuest({ kind: "breakdown" } as unknown as AuthoredQuest)).toBe(false);
	});

	it("copies the files so a later edit cannot change the review input", () =>
	{
		const files = { "A.h": "one" };
		const input = codeReviewInputFrom(buildQuest(), PATTERN_CARDS, files, sampleRun());
		files["A.h"] = "two";

		expect(input.files["A.h"]).toBe("one");
	});
});

/** One pack with the build quest, as the content catalog outlines it. */
const PACKS = [{
	id: "unreal-foundations",
	order: 1,
	worlds: [{ id: "w1", order: 1, quests: [{ id: "w1.health", title: "Health Component", kind: "build", difficulty: 2, xp: 100, order: 1, prerequisites: [], terms: [], patterns: [], skills: [], scaffold: "worked" }] }],
}] as unknown as PackOutline[];

/** A recorder that captures what it hands to recordAttempt. */
function recorderCapturing(): { recorder: CodeAttemptRecorder; inputs: AttemptInput[] }
{
	const inputs: AttemptInput[] = [];
	const recorder = new CodeAttemptRecorder({ listPacks: async () => PACKS, recordAttempt: async (input) => { inputs.push(input); return OUTCOME; } });

	return { recorder, inputs };
}

describe("CodeAttemptRecorder", () =>
{
	const allPassed = sampleRun({ ok: true, testsPassed: 2, testsTotal: 2 });

	it("scores 0.6 tests plus 0.4 review and records a Submit", async () =>
	{
		const { recorder, inputs } = recorderCapturing();

		await recorder.record({ questId: "w1.health", run: allPassed, review: codeReview("claude-code", 50), files: { "Health.cpp": "// code" } });

		expect(inputs[0]).toMatchObject({ quest: { id: "w1.health" }, score: 80, passed: true, compiled: true, isSubmit: true, review: codeReview("claude-code", 50), files: { "Health.cpp": "// code" } });
	});

	it("counts a tests-only review as no review score, so the score is the tests alone", async () =>
	{
		const { recorder, inputs } = recorderCapturing();

		await recorder.record({ questId: "w1.health", run: sampleRun(), review: codeReview("tests-only", 0), files: {} });

		expect(inputs[0]).toMatchObject({ score: 50, passed: false });
	});

	it("records a build that did not compile as a zero-score failure", async () =>
	{
		const { recorder, inputs } = recorderCapturing();

		await recorder.record({ questId: "w1.health", run: sampleRun({ compiled: false }), files: {} });

		expect(inputs[0]).toMatchObject({ score: 0, passed: false, compiled: false });
	});

	it("refuses a quest that is not in the packs", async () =>
	{
		await expectAppError(recorderCapturing().recorder.record({ questId: "gone", run: allPassed, files: {} }), "quest-not-found");
	});
});

describe("AttemptReviewService", () =>
{
	const attempts: AttemptRecord[] = [
		{ attemptId: "attempt-1", questId: "w1.health", at: "2026-10-21T10:00:00.000Z", score: 80, passed: true, xpGained: 100, review: codeReview("claude-code") },
		{ attemptId: "attempt-2", questId: "w1.concept", at: "2026-10-21T11:00:00.000Z", score: 90, passed: true, xpGained: 20 },
	];

	/** The service over fixed attempts, recording what the graders receive. */
	function followUps()
	{
		const received = { explain: [] as FindingExplanationInput[], grade: [] as ExplainGradeInput[] };
		const service = new AttemptReviewService(
			{ attempts: () => attempts, submittedFiles: () => ({ "Health.cpp": "// code" }), questBrief: async () => "Build a health component." },
			{
				explainFinding: async (input) => { received.explain.push(input); return "Because nothing hears it."; },
				gradeExplain: async (input) => { received.grade.push(input); return { score: 85, verdict: "correct", note: "Yes.", provider: "claude-code" }; },
			},
		);

		return { service, received };
	}

	it("explains a finding with its cache key, brief, and the submitted files", async () =>
	{
		const { service, received } = followUps();

		await expect(service.explainFinding({ attemptId: "attempt-1", findingIndex: 0 })).resolves.toBe("Because nothing hears it.");
		expect(received.explain[0]).toEqual({ cacheKey: "attempt-1:2026-10-21T10:00:00.000Z:0", brief: "Build a health component.", finding: codeReview("claude-code").findings[0], files: { "Health.cpp": "// code" } });
	});

	it("grades a reflection answer against the review's question with its summary as context", async () =>
	{
		const { service, received } = followUps();

		await expect(service.answerReflection({ attemptId: "attempt-1", answer: "So the HUD can listen." })).resolves.toMatchObject({ verdict: "correct" });
		expect(received.grade[0]).toEqual({ prompt: "Why a delegate?", context: "Code review summary: Clean split.", answer: "So the HUD can listen." });
	});

	it("answers attempt-not-found for an unknown attempt, an attempt without a review, and a finding past the end", async () =>
	{
		const { service } = followUps();

		await expectAppError(service.explainFinding({ attemptId: "attempt-9", findingIndex: 0 }), "attempt-not-found");
		await expectAppError(service.answerReflection({ attemptId: "attempt-2", answer: "x" }), "attempt-not-found");
		await expectAppError(service.explainFinding({ attemptId: "attempt-1", findingIndex: 5 }), "attempt-not-found");
	});
});

describe("review IPC routing", () =>
{
	/** Registers the handler table with a fake review service and answers an invoker plus the progress events sent. */
	function invokerWith(review: ReviewHandlerService)
	{
		const sent: BuildProgressEvent[] = [];
		const handlersByChannel = new Map<string, WrappedHandler>();
		const registrar: IpcHandleRegistrar = { handle: (channel, listener) => { handlersByChannel.set(channel, listener as WrappedHandler); } };
		const unused = (): never => { throw new Error("not used"); };

		const dependencies = {
			getAppVersion: () => "1.0.0",
			getEngineLocator: unused,
			getContentCatalog: unused,
			pickFolder: async () => null,
			progressService: {},
			progressContentService: {},
			getSandboxService: unused,
			runRegistry: new RunRegistry(),
			sendProgress: (event: BuildProgressEvent) => sent.push(event),
			settingsService: {},
			readEnvironmentStatus: unused,
			getReviewHandlers: () => review,
		} as unknown as HandlerDependencies;

		registerHandlers(registrar, createHandlers(dependencies));

		const invoke = (channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<unknown>> => (handlersByChannel.get(channel) as unknown as (event: object, ...rest: unknown[]) => Promise<IpcResponse<unknown>>)({}, ...methodArguments);

		return { invoke, sent };
	}

	/** A fake review service. */
	const FAKE_REVIEW: ReviewHandlerService = {
		getProviderStatuses: async () => [{ id: "claude-code", available: true, version: "2.1.304" }, { id: "tests-only", available: true }],
		testClaudeCode: async () => ({ id: "claude-code", available: false, reason: "Claude Code is not signed in." }),
		explainFinding: async (request) => `finding ${request.findingIndex} of ${request.attemptId}`,
		answerReflection: async (request) => ({ score: 80, verdict: "correct", note: request.answer, provider: "claude-code" }),
		submitQuest: async (_request, onProgress) =>
		{
			onProgress({ phase: "reviewing", lastLine: "Reviewing your code" });

			return { run: sampleRun(), outcome: OUTCOME, review: codeReview("claude-code") } as Awaited<ReturnType<ReviewHandlerService["submitQuest"]>>;
		},
	};

	it("answers the four review methods from the review service", async () =>
	{
		const { invoke } = invokerWith(FAKE_REVIEW);

		expect(await invoke(IPC_CHANNELS.getReviewProviders)).toMatchObject({ ok: true, value: [{ id: "claude-code" }, { id: "tests-only" }] });
		expect(await invoke(IPC_CHANNELS.testClaudeCode)).toMatchObject({ ok: true, value: { available: false } });
		expect(await invoke(IPC_CHANNELS.explainFinding, { attemptId: "attempt-1", findingIndex: 2 })).toEqual({ ok: true, value: "finding 2 of attempt-1" });
		expect(await invoke(IPC_CHANNELS.answerReflection, { attemptId: "attempt-1", answer: "Because." })).toMatchObject({ ok: true, value: { note: "Because." } });
	});

	it("checks payloads before reaching the review service", async () =>
	{
		const { invoke } = invokerWith(FAKE_REVIEW);

		expect(await invoke(IPC_CHANNELS.explainFinding, { attemptId: "../x", findingIndex: -1 })).toMatchObject({ ok: false, error: { code: "invalid-payload" } });
	});

	it("runs submitQuest under the run id and stamps its progress events", async () =>
	{
		const { invoke, sent } = invokerWith(FAKE_REVIEW);

		const response = await invoke(IPC_CHANNELS.submitQuest, { runId: "run-7", questId: "w1.health", files: { "Health.cpp": "// code" } });

		expect(response).toMatchObject({ ok: true, value: { review: { provider: "claude-code" } } });
		expect(sent[0]).toMatchObject({ runId: "run-7", phase: "reviewing", elapsedMs: expect.any(Number) });
	});
});

describe("createReviewHandlers end to end with fakes", () =>
{
	it("submits with the tests-only reviewer, stores the review and files on the attempt, and explains a finding from them", async () =>
	{
		const testsOnly = new TestsOnlyProvider();
		const graders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };
		const reviewService = new ReviewService(new ProviderSelector(fixedSettings("tests-only"), [], testsOnly), new ScriptedProvider("claude-code"), testsOnly, graders);
		const { service: progress } = createTestProgressService();
		const runRequests: RunRequest[] = [];

		const handlers = createReviewHandlers({
			reviewService,
			content: { listPacks: async () => PACKS, getAuthoredQuest: async (questId) => (questId === "w1.health" ? buildQuest() : undefined), getPatternCards: async () => PATTERN_CARDS },
			progress,
			runQuest: async (request, onProgress) =>
			{
				runRequests.push(request);
				onProgress({ phase: "testing", lastLine: "Running tests" });

				return sampleRun();
			},
		});

		const submit = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);

		expect(runRequests).toEqual([REQUEST]);
		expect(submit.review).toMatchObject({ provider: "tests-only", score: 50 });
		expect(submit.outcome.attempt).toMatchObject({ score: 50, passed: false, review: { provider: "tests-only" }, files: REQUEST.files });

		const attemptId = submit.outcome.attempt.attemptId;
		const explanation = await handlers.explainFinding({ attemptId, findingIndex: 0 });

		expect(explanation).toContain("fired 0 times");
		await expect(handlers.answerReflection({ attemptId, answer: "Because." })).resolves.toMatchObject({ provider: "tests-only" });
	});
});

/** A real ReviewService over two scripted AI providers, with the given choice. */
function reviewServiceWith(choice: "auto" | "anthropic-api", claudeCode: ScriptedProvider, anthropicApi: ScriptedProvider): ReviewService
{
	const testsOnly = new TestsOnlyProvider();
	const graders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };

	return new ReviewService(new ProviderSelector(fixedSettings(choice), [claudeCode, anthropicApi], testsOnly), claudeCode, testsOnly, graders);
}

describe("M1.7c fix round 1", () =>
{
	it("fix 1: a progress reset cannot serve an old explanation, because the attempt time is in the cache key", async () =>
	{
		const explainer = new FindingExplainer();
		const provider = new ScriptedProvider("claude-code", ["{\"explanation\": \"First save.\"}", "{\"explanation\": \"After the reset.\"}"]);
		let attempts: AttemptRecord[] = [{ attemptId: "attempt-1", questId: "w1.health", at: "2026-10-21T10:00:00.000Z", score: 80, passed: true, xpGained: 100, review: codeReview("claude-code"), files: {} }];
		const service = new AttemptReviewService({ attempts: () => attempts, submittedFiles: () => ({}), questBrief: async () => "" }, { explainFinding: (input) => explainer.explain(provider, input), gradeExplain: async () => { throw new Error("not used"); } });

		await expect(service.explainFinding({ attemptId: "attempt-1", findingIndex: 0 })).resolves.toBe("First save.");

		// After resetProgress the first new attempt is attempt-1 again, at a later time.
		attempts = [{ ...attempts[0]!, at: "2026-10-22T09:00:00.000Z" }];
		await expect(service.explainFinding({ attemptId: "attempt-1", findingIndex: 0 })).resolves.toBe("After the reset.");
		expect(provider.requests).toHaveLength(2);
	});

	it("fix 2: once recording starts the run is ended, so a cancel finds no run and the saved Submit is reported as done", async () =>
	{
		let releaseRecording: () => void = () => undefined;
		const recordingGate = new Promise<void>((resolve) => { releaseRecording = resolve; });
		let recordingStarted: () => void = () => undefined;
		const recordingBegan = new Promise<void>((resolve) => { recordingStarted = resolve; });

		const review: ReviewHandlerService = {
			getProviderStatuses: async () => [],
			testClaudeCode: async () => ({ id: "claude-code", available: false }),
			explainFinding: async () => "",
			answerReflection: async () => ({ score: 0, verdict: "incorrect", note: "", provider: "tests-only" }),
			submitQuest: async (_request, _onProgress, _signal, onRecording) =>
			{
				onRecording?.();
				recordingStarted();
				await recordingGate;

				return { run: sampleRun(), outcome: OUTCOME } as Awaited<ReturnType<ReviewHandlerService["submitQuest"]>>;
			},
		};

		const handlersByChannel = new Map<string, WrappedHandler>();
		const registry = new RunRegistry();
		const unused = (): never => { throw new Error("not used"); };
		registerHandlers({ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) }, createHandlers({
			getAppVersion: () => "1.0.0", getEngineLocator: unused, getContentCatalog: unused, pickFolder: async () => null, progressService: {}, progressContentService: {}, getSandboxService: unused,
			runRegistry: registry, sendProgress: () => undefined, settingsService: {}, readEnvironmentStatus: unused, getReviewHandlers: () => review,
		} as unknown as HandlerDependencies));
		const invoke = (channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<unknown>> => (handlersByChannel.get(channel) as unknown as (event: object, ...rest: unknown[]) => Promise<IpcResponse<unknown>>)({}, ...methodArguments);

		const submit = invoke(IPC_CHANNELS.submitQuest, { runId: "run-9", questId: "w1.health", files: { "Health.cpp": "// code" } });
		await recordingBegan;

		expect(await invoke(IPC_CHANNELS.cancelRun, "run-9")).toMatchObject({ ok: false, error: { code: "run-not-found" } });

		releaseRecording();
		expect(await submit).toMatchObject({ ok: true, value: { outcome: OUTCOME } });
	});

	it("fix 2: QuestSubmitService calls onRecording after the review and right before recording", async () =>
	{
		const order: string[] = [];
		const service = new QuestSubmitService({
			getAuthoredQuest: async () => buildQuest(),
			getPatternCards: async () => PATTERN_CARDS,
			runQuest: async () => { order.push("run"); return sampleRun(); },
			reviewCode: async () => { order.push("review"); return codeReview("claude-code"); },
			recordCodeAttempt: async () => { order.push("record"); return OUTCOME; },
		});

		await service.submit(REQUEST, () => undefined, new AbortController().signal, () => order.push("recording starts"));

		expect(order).toEqual(["run", "review", "recording starts", "record"]);
	});

	it("fix 3 (A70): Claude Code reviews a compiled submit with failing tests; the API reviews only all-passed submits", async () =>
	{
		const withClaude = reviewServiceWith("auto", new ScriptedProvider("claude-code", [recorded("code-review", "good.json")]), new ScriptedProvider("anthropic-api", []));
		await expect(withClaude.reviewCode(sampleCodeInput())).resolves.toMatchObject({ provider: "claude-code" });

		const signedOut = new ScriptedProvider("claude-code", [], { id: "claude-code", available: false, reason: "Claude Code was not found." });
		const api = new ScriptedProvider("anthropic-api", [recorded("code-review", "good.json")]);
		const withApi = reviewServiceWith("auto", signedOut, api);

		await expect(withApi.reviewCode(sampleCodeInput())).resolves.toMatchObject({ provider: "tests-only", fallbackReason: API_FAILING_TESTS_REASON });
		expect(api.requests).toHaveLength(0);

		await expect(withApi.reviewCode(sampleCodeInput({ run: passingRun() }))).resolves.toMatchObject({ provider: "anthropic-api" });
		expect(api.requests).toHaveLength(1);
	});

	it("fix 3 (A70): with the API chosen explicitly, failing tests are graded by tests only with the reason", async () =>
	{
		const api = new ScriptedProvider("anthropic-api", []);
		const service = reviewServiceWith("anthropic-api", new ScriptedProvider("claude-code", []), api);

		const review = await service.reviewCode(sampleCodeInput());

		expect(review).toMatchObject({ provider: "tests-only", fallbackReason: API_FAILING_TESTS_REASON });
		expect(review?.retryReviewSuggested).toBeUndefined();
		expect(api.requests).toHaveLength(0);
	});

	it("fix 4: the reviewer reads the same capped files the attempt stores, while the engine builds the full files", async () =>
	{
		const huge = "x".repeat(MAXIMUM_STORED_FILE_LENGTH + 100);
		const calls = { reviewInputs: [] as CodeReviewInput[], recorded: [] as CodeAttemptSubmission[] };
		let ranWith: Record<string, string> = {};
		const service = new QuestSubmitService({
			getAuthoredQuest: async () => buildQuest(),
			getPatternCards: async () => PATTERN_CARDS,
			runQuest: async (request) => { ranWith = request.files; return sampleRun(); },
			reviewCode: async (input) => { calls.reviewInputs.push(input); return codeReview("claude-code"); },
			recordCodeAttempt: async (submission) => { calls.recorded.push(submission); return OUTCOME; },
		});

		await service.submit({ ...REQUEST, files: { "Huge.cpp": huge } }, () => undefined, new AbortController().signal);

		const capped = "x".repeat(MAXIMUM_STORED_FILE_LENGTH) + CUT_OFF_NOTE;
		expect(ranWith["Huge.cpp"]).toBe(huge);
		expect(calls.reviewInputs[0]?.files["Huge.cpp"]).toBe(capped);
		expect(calls.recorded[0]?.files["Huge.cpp"]).toBe(capped);
	});

	it("fix 5: a malformed or refused reply after the engine run falls back to tests only with a retry hint, and the Submit is recorded", async () =>
	{
		for (const reply of ["{\"score\": \"oops\"}", refusedError("Claude Code") as unknown as Error])
		{
			const reviewService = reviewServiceWith("auto", new ScriptedProvider("claude-code", [reply]), new ScriptedProvider("anthropic-api", []));
			const { service: progress } = createTestProgressService();
			const handlers = createReviewHandlers({
				reviewService,
				content: { listPacks: async () => PACKS, getAuthoredQuest: async () => buildQuest(), getPatternCards: async () => PATTERN_CARDS },
				progress,
				runQuest: async () => sampleRun(),
			});

			const submit = await handlers.submitQuest(REQUEST, () => undefined, new AbortController().signal);

			expect(submit.review).toMatchObject({ provider: "tests-only", retryReviewSuggested: true, fallbackReason: expect.stringMatching(/Retry review/) });
			expect(progress.getProgress().attempts).toHaveLength(1);
			expect(submit.outcome.attempt.review?.provider).toBe("tests-only");
		}
	});

	it("fix 6: only a quest's last five Submits keep their review, like their files", async () =>
	{
		const { service: progress } = createTestProgressService();
		const quest = makeQuest({ id: "w1.health", kind: "build" });

		for (let index = 1; index <= STORED_DETAIL_ATTEMPTS_PER_QUEST + 2; index++)
		{
			await progress.recordAttempt({ quest, score: 50, passed: false, compiled: true, isSubmit: true, review: { ...codeReview("claude-code"), summary: `review ${index}` } }, [quest]);
		}

		const summaries = progress.getProgress().attempts.map((attempt) => attempt.review?.summary ?? null);

		expect(summaries).toEqual([null, null, "review 3", "review 4", "review 5", "review 6", "review 7"]);
	});
});

