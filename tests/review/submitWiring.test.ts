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
import { expectAppError, sampleRun } from "./reviewTestKit";

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
		expect(received.explain[0]).toEqual({ cacheKey: "attempt-1:0", brief: "Build a health component.", finding: codeReview("claude-code").findings[0], files: { "Health.cpp": "// code" } });
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
