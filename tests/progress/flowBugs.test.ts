// M1.6g fixes from the real-engine flow: self-explanations survive a restart, self-checked explain items are not misses, and Run and Submit refuse a locked quest (A800 to A802).
import { describe, expect, it } from "vitest";

import type { DrillItem } from "@shared/types/content";
import type { ItemResponse } from "@shared/types/progress";

import { ContentCatalog } from "../../src/main/content/ContentCatalog";
import { createHandlers, type HandlerDependencies } from "../../src/main/ipc/createHandlers";
import { ProgressContentService } from "../../src/main/services/progress/ProgressContentService";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { createTestProgressContent, fakeGraders, fixtureContent } from "../support/contentFixture";
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
	const handlers = createHandlers({
		getAppVersion: () => "1.0.0",
		getEngineLocator: unused,
		getContentCatalog: () => catalog,
		pickFolder: async () => null,
		progressService: service,
		progressContentService: content,
		runRegistry: new RunRegistry(),
		sendProgress: () => undefined,
		getQuestRunService: () => ({ runQuest: async (questId: string) => { runs.push(`run ${questId}`); return { compiled: true }; }, checkSnippetSyntax: unused }),
		getReviewHandlers: () => ({ submitQuest: async (request: { questId: string }) => { runs.push(`submit ${request.questId}`); return {}; } }),
	} as unknown as HandlerDependencies);

	return { handlers, service, content };
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
