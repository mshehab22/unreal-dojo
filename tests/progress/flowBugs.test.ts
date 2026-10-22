// M1.6g fixes from the real-engine flow: self-explanations survive a restart, self-checked explain items are not misses, and Run and Submit refuse a locked quest (A800 to A802).
import { describe, expect, it } from "vitest";

import type { ConceptQuest, DrillItem } from "@shared/types/content";
import type { ItemResponse, SubmitOutcome } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

import { ContentCatalog } from "../../src/main/content/ContentCatalog";
import { createHandlers, type HandlerDependencies } from "../../src/main/ipc/createHandlers";
import { ProgressContentService } from "../../src/main/services/progress/ProgressContentService";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import { SettingsService } from "../../src/main/services/settings/SettingsService";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { FakeSecretEncryptor, FakeSettingsChecks, MemorySettingsStore } from "../settings/settingsFakes";
import { conceptQuest, createTestProgressContent, fakeGraders, fixtureContent } from "../support/contentFixture";
import { FixedClock } from "../support/FixedClock";
import { MemoryFileSystem } from "../support/MemoryFileSystem";
import { localMoment } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

/** Throws if a dependency the test does not expect is used. */
const unused = (): never =>
{
	throw new Error("not used");
};

/** The handler table on a save loaded from `fileSystem`, like one app start. `runs` records every run and submit that reached the engine. */
async function startApp(fileSystem: MemoryFileSystem, runs: string[] = [])
{
	const clock = new FixedClock(localMoment(2026, 10, 21, 9));
	const service = await ProgressService.openOrRefuse(new ProgressStore(fileSystem, "/user-data"), clock, new SequenceRandom());
	const loaded = fixtureContent();
	const catalog = new ContentCatalog({ root: "/fixture", folderExists: async () => true, loadContent: async () => loaded });
	const content = new ProgressContentService(catalog, service, fakeGraders(), new SequenceRandom(), () => "session-1");
	const dependencies: HandlerDependencies = {
		getAppVersion: () => "1.0.0",
		getEngineLocator: unused,
		getContentCatalog: () => catalog,
		pickFolder: async () => null,
		progressService: service,
		getSandboxService: unused,
		getQuestRunService: () => ({
			runQuest: async (questId) =>
			{
				runs.push(`run ${questId}`);
				return { compiled: true } as RunResult;
			},
			checkSnippetSyntax: unused,
			rebuildSandbox: unused,
			removeQuestFiles: unused,
		}),
		getEditorService: unused,
		runRegistry: new RunRegistry(),
		sendProgress: () => undefined,
		progressContentService: content,
		settingsService: new SettingsService(new MemorySettingsStore(), new FakeSecretEncryptor(), new FakeSettingsChecks()),
		readEnvironmentStatus: unused,
		getReviewHandlers: () => ({
			getProviderStatuses: unused,
			testClaudeCode: unused,
			explainFinding: unused,
			answerReflection: unused,
			submitQuest: async (request) =>
			{
				runs.push(`submit ${request.questId}`);
				return {} as SubmitOutcome;
			},
			retryReview: unused,
		}),
	};
	const handlers = createHandlers(dependencies);

	return { handlers, service, content, dependencies };
}

/** A right answer for a fixture drill item. */
function rightAnswerFor(item: DrillItem): ItemResponse
{
	if (item.source === "parsons") return { kind: "order", lineIds: item.parsons.lines.map((_, index) => `line-${index}`) };

	const question = item.question;
	switch (question.type)
	{
		case "multiple-choice": return { kind: "choice", choice: String(question.answerIndex) };
		case "fill-blank": return { kind: "text", text: question.acceptedAnswers[0] ?? "" };
		case "which-pattern": return { kind: "choice", choice: question.answer };
		case "spot-the-bug": return { kind: "choice", choice: String(question.bugLine) };
		case "explain-in-one-sentence": return { kind: "text", text: question.modelAnswer };
	}
}

/** Right answers to the fixture concept quest. */
const CONCEPT_ANSWERS: ItemResponse[] = [{ kind: "choice", choice: "1" }, { kind: "text", text: "UPROPERTY" }, { kind: "choice", choice: "observer" }, { kind: "choice", choice: "2" }, { kind: "text", text: "It does a." }];

describe("self-explanations (A800)", () =>
{
	it("saves a worked build's self-explanations through saveQuestDraft and reads them back after a restart", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		const first = await startApp(fileSystem);
		const selfExplanations = { "Thing.h:3": "It makes the property editable.", "Thing.h:7": "It runs every frame." };

		await first.handlers.saveQuestDraft.handle({ questId: "w1-build", files: { "Thing.h": "#pragma once" }, selfExplanations });

		const second = await startApp(fileSystem);
		const quest = (await second.handlers.getProgress.handle()).quests["w1-build"];

		expect(quest?.selfExplanations).toEqual(selfExplanations);
		expect(quest?.savedFiles).toEqual({ "Thing.h": "#pragma once" });
	});

	it("keeps saved self-explanations when a later draft sends only files, and clears them on a quest reset", async () =>
	{
		const { handlers } = await startApp(new MemoryFileSystem());

		await handlers.saveQuestDraft.handle({ questId: "w1-build", selfExplanations: { "Thing.h:3": "Why." } });
		await handlers.saveQuestDraft.handle({ questId: "w1-build", files: { "Thing.h": "// edited" } });
		expect((await handlers.getProgress.handle()).quests["w1-build"]?.selfExplanations).toEqual({ "Thing.h:3": "Why." });

		expect((await handlers.resetQuest.handle("w1-build")).selfExplanations).toBeUndefined();
	});
});

describe("self-checked explain items (A801)", () =>
{
	it("marks a self-checked explain item as selfChecked, not a miss, and leaves it out of the drill's counts", async () =>
	{
		const { content, clock } = createTestProgressContent({ graders: fakeGraders("tests-only", "incorrect") });
		await content.submitConcept({ questId: "w1-concept", prediction: null, answers: CONCEPT_ANSWERS });
		clock.advanceDays(1);

		const session = await content.startDrill({ kind: "due" });
		const results = [];
		for (const item of session.items) results.push(await content.answerDrillItem({ sessionId: session.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) }));

		const selfChecked = results.filter((result) => result.selfChecked);
		expect(selfChecked.length).toBeGreaterThan(0);
		expect(results.filter((result) => !result.selfChecked).every((result) => result.correct && result.selfChecked === undefined)).toBe(true);

		const outcome = await content.finishDrill(session.sessionId);

		expect(outcome.selfCheckedCount).toBe(selfChecked.length);
		expect(outcome.totalCount).toBe(session.items.length - selfChecked.length);
		expect(outcome.correctCount).toBe(outcome.totalCount);
	});

	it("pays no drill XP, streak, or daily credit when the only due item was self-checked, however many times the drill runs", async () =>
	{
		// A copy of the concept quest that only teaches term.e through one explain question (the fixture objects are shared, so they are not changed).
		const content = fixtureContent();
		const world = content.packs[0]?.worlds[0];
		if (!world) throw new Error("expected world 1");
		const explainOnly: ConceptQuest = { ...conceptQuest, terms: ["term.e"], questions: [{ id: "q-explain", type: "explain-in-one-sentence", prompt: "Explain term.e", modelAnswer: "It does e.", rubric: [], explanation: "" }] };
		world.quests = world.quests.map((quest) => (quest.id === "w1-concept" ? explainOnly : quest));

		const { content: progressContent, service } = createTestProgressContent({ content, graders: fakeGraders("tests-only", "incorrect"), prepare: (progress) =>
		{
			progress.quests["w1-concept"] = { status: "passed", bestScore: 100, attempts: 1, hintsRevealed: 0, revealedHints: [], solutionViewed: false, seerStoneSpent: false, effortXpGranted: false, savedFiles: {}, lastAttemptAt: "2026-10-20T09:00:00.000Z" };
			progress.memory["term.e"] = { ease: 2.5, intervalDays: 1, repetitions: 1, mastery: "familiar", lastReviewedAt: "2026-10-20T08:00:00.000Z" };
			progress.schedule["term.e"] = "2026-10-21T06:00:00.000Z";
		} });
		await progressContent.getDailyQuest();
		await progressContent.getDailyQuest();
		await service.chooseDailyOffer(0);

		for (let round = 0; round < 4; round++)
		{
			const session = await progressContent.startDrill({ kind: "due" });
			expect(session.items.map((item) => item.itemId)).toEqual(["term.e"]);

			const [item] = session.items;
			if (!item) throw new Error("expected the explain item");
			expect((await progressContent.answerDrillItem({ sessionId: session.sessionId, itemId: item.itemId, response: { kind: "text", text: "It does e." } })).selfChecked).toBe(true);

			expect(await progressContent.finishDrill(session.sessionId)).toMatchObject({ xpGained: 0, selfCheckedCount: 1, totalCount: 0 });
		}

		const progress = service.getProgress();
		expect(progress.xp).toBe(0);
		expect(progress.streak.count).toBe(0);
		expect(progress.daily.done).toBe(false);
		expect(progress.schedule["term.e"]).toBe("2026-10-21T06:00:00.000Z");
	});

	it("counts an AI-graded explain item normally (selfCheckedCount 0)", async () =>
	{
		const { content, clock } = createTestProgressContent({ graders: fakeGraders("claude-code", "correct") });
		await content.submitConcept({ questId: "w1-concept", prediction: null, answers: CONCEPT_ANSWERS });
		clock.advanceDays(1);

		const session = await content.startDrill({ kind: "due" });
		for (const item of session.items) expect((await content.answerDrillItem({ sessionId: session.sessionId, itemId: item.itemId, response: rightAnswerFor(item.item) })).selfChecked).toBeUndefined();

		expect(await content.finishDrill(session.sessionId)).toMatchObject({ selfCheckedCount: 0, correctCount: session.items.length, totalCount: session.items.length });
	});

	it("marks the self-checked explain answer of a concept quest as selfChecked", async () =>
	{
		const { content } = createTestProgressContent({ graders: fakeGraders("tests-only", "incorrect") });
		const { results } = await content.submitConcept({ questId: "w1-concept", prediction: null, answers: CONCEPT_ANSWERS });

		expect(results.map((result) => result.selfChecked ?? false)).toEqual([false, false, false, false, true]);
	});
});

describe("Run and Submit check the quest is open (A802)", () =>
{
	const request = (questId: string) => ({ runId: `run-${questId}`, questId, files: { "Thing.h": "#pragma once" } });

	it("refuses a locked quest with quest-locked and an unknown one with quest-not-found, before any build starts", async () =>
	{
		const runs: string[] = [];
		const { handlers } = await startApp(new MemoryFileSystem(), runs);

		await expect(handlers.runQuest.handle(request("w1-build"))).rejects.toMatchObject({ appError: { code: "quest-locked", message: "Pass w1-concept first." } });
		await expect(handlers.submitQuest.handle(request("w1-build"))).rejects.toMatchObject({ appError: { code: "quest-locked" } });
		await expect(handlers.runQuest.handle(request("no-such-quest"))).rejects.toMatchObject({ appError: { code: "quest-not-found" } });
		expect(runs).toEqual([]);
	});

	it("finds the run when a cancel lands during the availability check, answers run-cancelled, and never starts the build (A803)", async () =>
	{
		const runs: string[] = [];
		const { handlers, content, dependencies } = await startApp(new MemoryFileSystem(), runs);
		let releaseCheck = (): void => undefined;
		content.assertQuestOpen = () => new Promise<void>((resolve) => { releaseCheck = resolve; });

		const running = handlers.runQuest.handle(request("w1-build"));
		await Promise.resolve();
		dependencies.runRegistry.cancel("run-w1-build");
		releaseCheck();

		await expect(running).rejects.toMatchObject({ appError: { code: "run-cancelled" } });
		expect(runs).toEqual([]);
	});

	it("runs and submits once the quest is open", async () =>
	{
		const runs: string[] = [];
		const { handlers } = await startApp(new MemoryFileSystem(), runs);
		await handlers.submitConcept.handle({ questId: "w1-concept", prediction: null, answers: CONCEPT_ANSWERS });

		await handlers.runQuest.handle(request("w1-build"));
		await handlers.submitQuest.handle(request("w1-build"));

		expect(runs).toEqual(["run w1-build", "submit w1-build"]);
	});
});
