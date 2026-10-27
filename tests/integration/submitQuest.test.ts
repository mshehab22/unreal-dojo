// Real engine check of M1.7c: a Pack 1 World 1 quest submitted end to end through the real submitQuest handler: run, tests-only review, recorded attempt.
// Opt in with DOJO_ENGINE_ROOT=<engine root>; skipped otherwise, or when that folder has no engine (A187).
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { IPC_CHANNELS, type IpcResponse } from "@shared/ipc";
import type { SubmitOutcome } from "@shared/types/progress";
import type { BuildProgressEvent } from "@shared/types/run";

import { createContentCatalog } from "../../src/main/content/createContentCatalog";
import { createHandlers } from "../../src/main/ipc/createHandlers";
import { registerHandlers, type WrappedHandler } from "../../src/main/ipc/registerHandlers";
import { createReviewHandlers } from "../../src/main/services/review/createReviewHandlers";
import { BreakdownGrader } from "../../src/main/services/review/graders/BreakdownGrader";
import { CodeReviewer } from "../../src/main/services/review/graders/CodeReviewer";
import { ExplainGrader } from "../../src/main/services/review/graders/ExplainGrader";
import { FindingExplainer } from "../../src/main/services/review/graders/FindingExplainer";
import { TestsOnlyProvider } from "../../src/main/services/review/providers/TestsOnlyProvider";
import { ProviderSelector } from "../../src/main/services/review/ProviderSelector";
import { ReviewService } from "../../src/main/services/review/ReviewService";
import { createEngineLocator } from "../../src/main/services/unreal/createEngineLocator";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { fixedSettings, ScriptedProvider } from "../review/reviewTestKit";
import { assertNoForeignLiveCodingSession } from "../support/liveCodingSessions";
import { createIntegrationServices } from "../support/createIntegrationServices";
import { createTestProgressService } from "../support/progressFixtures";
import { MemoryUnrealSettings } from "../unreal/MemoryUnrealSettings";

/** The engine to test against, from the environment. */
const ENGINE_ROOT = process.env.DOJO_ENGINE_ROOT ?? "";

/** True when an engine is present at that root. */
const HAS_ENGINE = ENGINE_ROOT !== "" && existsSync(join(ENGINE_ROOT, "Engine", "Build", "Build.version"));

/** The repository root. */
const REPOSITORY = join(__dirname, "..", "..");

/** Long enough for a cold build and a headless editor start. */
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** The quest under test: Pack 1 World 1's score keeper, which compiles against f1-training-dummy and f1-popup-target. */
const QUEST_ID = "f1-score-keeper";

/** Reads a reference solution folder as a learner's file map. */
async function solutionFiles(questId: string): Promise<Record<string, string>>
{
	const folder = join(REPOSITORY, "tools", "solutions", questId);
	const files: Record<string, string> = {};

	for (const fileName of await readdir(folder)) files[fileName] = await readFile(join(folder, fileName), "utf8");

	return files;
}

describe.skipIf(!HAS_ENGINE)(`submitQuest against ${ENGINE_ROOT || "no engine"}`, () =>
{
	// Stops at once, with the reason, when another editor's Live Coding would make every build fail (A1076).
	beforeAll(() => assertNoForeignLiveCodingSession());

	let pickedFolder = "";
	const events: BuildProgressEvent[] = [];
	const settings = new MemoryUnrealSettings();
	const catalog = createContentCatalog(join(REPOSITORY, "content"));
	const { service: progress } = createTestProgressService();
	const services = HAS_ENGINE
		? createIntegrationServices({ templateFolder: join(REPOSITORY, "resources", "sandbox-template"), solutionsFolder: join(REPOSITORY, "tools", "solutions"), engineInspector: createEngineLocator(), settings, quests: catalog, learner: { isPassed: () => false, savedFiles: () => ({}) } }).services
		: null;
	const handlersByChannel = new Map<string, WrappedHandler>();

	if (services)
	{
		// The tests-only reviewer, so the check needs no Claude Code login and no API key.
		const testsOnly = new TestsOnlyProvider();
		const graders = { codeReviewer: new CodeReviewer(), breakdownGrader: new BreakdownGrader(), explainGrader: new ExplainGrader(), findingExplainer: new FindingExplainer() };
		const reviewService = new ReviewService(new ProviderSelector(fixedSettings("tests-only"), [], testsOnly), new ScriptedProvider("claude-code"), testsOnly, graders);
		const reviewHandlers = createReviewHandlers({ reviewService, content: catalog, progress, runQuest: (request, onProgress, signal) => services.questRunService.runQuest(request.questId, request.files, onProgress, signal) });

		registerHandlers(
			{ handle: (channel, listener) => void handlersByChannel.set(channel, listener as WrappedHandler) },
			createHandlers({
				getAppVersion: () => "test",
				getEngineLocator: () => { throw new Error("not used"); },
				getContentCatalog: () => catalog,
				pickFolder: async () => null,
				progressService: progress,
				getSandboxService: () => services.sandboxService,
				getQuestRunService: () => services.questRunService,
				runRegistry: new RunRegistry(),
				sendProgress: (event) => events.push(event),
				progressContentService: { assertQuestOpen: async () => undefined } as never,
				settingsService: {} as never,
				readEnvironmentStatus: () => { throw new Error("not used"); },
				getReviewHandlers: () => reviewHandlers,
				getEditorService: () => { throw new Error("not used"); },
			}),
		);
	}

	/** Calls one IPC channel like the preload does. */
	const invoke = <Value>(channel: string, ...methodArguments: unknown[]): Promise<IpcResponse<Value>> => handlersByChannel.get(channel)!({} as Parameters<WrappedHandler>[0], ...methodArguments) as Promise<IpcResponse<Value>>;

	afterAll(async () =>
	{
		if (pickedFolder !== "") await rm(pickedFolder, { recursive: true, force: true });
	});

	it("creates the sandbox through createSandbox", async () =>
	{
		pickedFolder = await mkdtemp(join(tmpdir(), "dojo-submitquest-"));

		const response = await invoke(IPC_CHANNELS.createSandbox, { runId: "setup-1", enginePath: ENGINE_ROOT, folder: pickedFolder });

		expect(response).toMatchObject({ ok: true, value: { ok: true } });
	}, STEP_TIMEOUT_MS);

	it("submits the score keeper: it builds, its tests pass, the tests-only review runs, and the attempt is recorded with its review and files", async () =>
	{
		events.length = 0;
		const files = await solutionFiles(QUEST_ID);
		const startedAt = Date.now();

		const response = await invoke<SubmitOutcome>(IPC_CHANNELS.submitQuest, { runId: "submit-1", questId: QUEST_ID, files });

		const elapsedMs = Date.now() - startedAt;
		const summary = response.ok
			? { elapsedMs, run: { ok: response.value.run.ok, testsPassed: response.value.run.testsPassed, testsTotal: response.value.run.testsTotal, loop: response.value.run.loop }, review: response.value.review, attempt: { ...response.value.outcome.attempt, files: Object.keys(response.value.outcome.attempt.files ?? {}) }, xp: response.value.outcome.xp.total, phases: [...new Set(events.map((event) => event.phase))] }
			: { elapsedMs, response };

		// Vitest may hide console output, so the proof can also go to a file named by DOJO_SUBMIT_PROOF.
		console.log(JSON.stringify(summary, null, 2));
		if (process.env.DOJO_SUBMIT_PROOF) await writeFile(process.env.DOJO_SUBMIT_PROOF, JSON.stringify(summary, null, 2));

		expect(response.ok).toBe(true);
		if (!response.ok) return;

		const { run, review, outcome } = response.value;
		expect(run).toMatchObject({ ok: true, compiled: true });
		expect(run.testsTotal).toBeGreaterThan(0);
		expect(review).toMatchObject({ provider: "tests-only", score: 100 });
		expect(outcome.attempt).toMatchObject({ questId: QUEST_ID, score: 100, passed: true, review: { provider: "tests-only" }, files });
		expect(progress.getProgress().quests[QUEST_ID]?.status).toBe("passed");

		expect(events.length).toBeGreaterThan(0);
		expect(events.every((event) => event.runId === "submit-1")).toBe(true);
		expect(events.map((event) => event.phase)).toEqual(expect.arrayContaining(["building", "testing", "reviewing"]));
		expect(events.findIndex((event) => event.phase === "reviewing")).toBe(events.length - 1);
	}, STEP_TIMEOUT_MS);
});
