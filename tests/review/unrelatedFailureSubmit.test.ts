// M5.1f: a Submit whose run failed outside the quest is not charged to the learner (A1208, A1209).
import { describe, expect, it } from "vitest";

import type { PackOutline } from "@shared/types/catalog";
import type { AuthoredQuest, PatternCard } from "@shared/types/content";
import type { AppError } from "@shared/types/errors";
import type { PlayerProgress } from "@shared/types/progress";
import type { CodeReview } from "@shared/types/review";
import type { RunRequest } from "@shared/types/run";

import { CodeAttemptRecorder } from "../../src/main/services/review/CodeAttemptRecorder";
import type { ReviewedCodeQuest } from "../../src/main/services/review/codeReviewInputFrom";
import { QuestSubmitService, UNRELATED_FAILURE_DETAIL_LINES, type CodeAttemptSubmission } from "../../src/main/services/review/QuestSubmitService";
import type { CodeReviewInput } from "../../src/main/services/review/ReviewInputs";
import { createTestProgressService } from "../support/progressFixtures";
import { expectAppError, sampleRun } from "./reviewTestKit";

/** The quest every test here submits. */
const QUEST_ID = "w1.health";

/** The Submit request every test here sends. */
const REQUEST: RunRequest = { runId: "run-1", questId: QUEST_ID, files: { "Health.cpp": "// code" } };

/** One pack holding the quest, as the content catalog outlines it. */
const PACKS = [{
	id: "unreal-foundations",
	order: 1,
	worlds: [{ id: "w1", order: 1, quests: [{ id: QUEST_ID, title: "Health Component", kind: "build", difficulty: 2, xp: 100, order: 1, prerequisites: [], terms: [], patterns: [], skills: [], scaffold: "worked" }] }],
}] as unknown as PackOutline[];

/** A build quest with the fields the review reads. */
const QUEST = { id: QUEST_ID, title: "Health Component", kind: "build", brief: "Build a health component.", rubric: ["Health lives in a component"], patterns: [] } as unknown as ReviewedCodeQuest;

/** A passing code review stand-in. */
const REVIEW: CodeReview = { score: 90, summary: "Clean split.", rubric: [], findings: [], reflectionQuestion: "Why?", alternativeHint: "", provider: "claude-code" };

/** The error the pipeline attaches to a run that failed outside the quest. */
const UNRELATED_FAILURE: AppError = {
	code: "build-environment-failed",
	message: "Unreal Build Tool crashed before it built your code.",
	suggestedAction: "Close the Unreal editor and Submit again.",
	detail: "UBT exit code 6",
};

/** A build output of the given number of numbered lines. */
function outputOfLines(count: number): string
{
	return Array.from({ length: count }, (_unused, index) => `output line ${index + 1}`).join("\n");
}

/** A Submit service over real progress and a real recorder, with spies on the review and the recording. */
function submitHarness(run: ReturnType<typeof sampleRun>)
{
	const { service: progress } = createTestProgressService(undefined, [0], (start: PlayerProgress) =>
	{
		start.spree = { current: 3, best: 3, armor: 0 };
	});

	const recorder = new CodeAttemptRecorder({ listPacks: async () => PACKS, recordAttempt: (input, allQuests) => progress.recordAttempt(input, allQuests) });
	const calls = { recorded: [] as CodeAttemptSubmission[], reviewed: [] as CodeReviewInput[] };

	const service = new QuestSubmitService({
		getAuthoredQuest: async (questId): Promise<AuthoredQuest | undefined> => (questId === QUEST_ID ? QUEST : undefined),
		getPatternCards: async (): Promise<PatternCard[]> => [],
		runQuest: async () => run,
		reviewCode: async (input) =>
		{
			calls.reviewed.push(input);

			return REVIEW;
		},
		recordCodeAttempt: async (submission) =>
		{
			calls.recorded.push(submission);

			return recorder.record(submission);
		},
	});

	return { service, progress, calls };
}

describe("a Submit that failed outside the quest", () =>
{
	it("rejects with the run's error and the end of its output, and records, reviews, and changes nothing", async () =>
	{
		const compilerOutput = outputOfLines(100);
		const { service, progress, calls } = submitHarness(sampleRun({ compiled: false, compilerOutput, unrelatedFailure: UNRELATED_FAILURE }));
		const before = structuredClone(progress.getProgress());

		const exception = await expectAppError(service.submit(REQUEST, () => undefined, new AbortController().signal), "build-environment-failed");
		const tail = (exception.appError.detail ?? "").split("\n\n")[1]?.split("\n") ?? [];

		expect(exception.appError.message).toBe(UNRELATED_FAILURE.message);
		expect(exception.appError.suggestedAction).toBe(UNRELATED_FAILURE.suggestedAction);
		expect(exception.appError.detail?.startsWith("UBT exit code 6\n\n")).toBe(true);
		expect(tail.length).toBeLessThanOrEqual(UNRELATED_FAILURE_DETAIL_LINES);
		expect(tail.at(-1)).toBe("output line 100");
		expect(tail[0]).toBe(`output line ${100 - UNRELATED_FAILURE_DETAIL_LINES + 1}`);

		expect(calls.recorded).toHaveLength(0);
		expect(calls.reviewed).toHaveLength(0);

		const after = progress.getProgress();
		expect(after.spree).toEqual({ current: 3, best: 3, armor: 0 });
		expect(after.xp).toBe(before.xp);
		expect(after.quests[QUEST_ID]?.attempts ?? 0).toBe(before.quests[QUEST_ID]?.attempts ?? 0);
		expect(after).toEqual(before);
	});

	it("leaves the detail undefined when the failure has none and the output is empty", async () =>
	{
		const failureWithoutDetail: AppError = { code: UNRELATED_FAILURE.code, message: UNRELATED_FAILURE.message, suggestedAction: UNRELATED_FAILURE.suggestedAction };
		const { service } = submitHarness(sampleRun({ compiled: false, compilerOutput: "\r\n\n", unrelatedFailure: failureWithoutDetail }));

		const exception = await expectAppError(service.submit(REQUEST, () => undefined, new AbortController().signal), "build-environment-failed");

		expect(exception.appError.detail).toBeUndefined();
	});

	it("still lets a cancel win", async () =>
	{
		const controller = new AbortController();
		const { service, calls } = submitHarness(sampleRun({ compiled: false, unrelatedFailure: UNRELATED_FAILURE }));
		controller.abort();

		await expectAppError(service.submit(REQUEST, () => undefined, controller.signal), "run-cancelled");
		expect(calls.recorded).toHaveLength(0);
	});

	it("control: a normal failed compile is still recorded and counts as an attempt", async () =>
	{
		const { service, progress, calls } = submitHarness(sampleRun({ compiled: false }));
		expect(progress.getProgress().quests[QUEST_ID]?.attempts ?? 0).toBe(0);

		const outcome = await service.submit(REQUEST, () => undefined, new AbortController().signal);

		expect(outcome.review).toBeUndefined();
		expect(calls.recorded).toHaveLength(1);
		expect(calls.reviewed).toHaveLength(0);
		expect(progress.getProgress().quests[QUEST_ID]?.attempts).toBe(1);
		expect(progress.getProgress().spree.current).toBe(0);
	});
});
