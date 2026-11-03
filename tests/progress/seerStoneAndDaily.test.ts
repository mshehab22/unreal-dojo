// M3.3 rule paths: the Seer Stone flow end to end (pricing, repeat and passed views, no stone held, the handler and the solution reader), the daily drill offer only when a drill can be rewarded, and today's chest kept in the daily state.
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ItemResponse } from "@shared/types/progress";

import { createHandlers, type HandlerDependencies } from "../../src/main/ipc/createHandlers";
import { toPackOutlines } from "../../src/main/content/contentViews";
import { DailyQuestService } from "../../src/main/services/progress/DailyQuestService";
import { SeerStoneRules } from "../../src/main/services/progress/SeerStoneRules";
import { SolutionFolderReader } from "../../src/main/services/progress/SolutionFolderReader";
import type { SolutionSource } from "../../src/main/services/progress/SolutionSource";
import { toRuleQuests } from "../../src/main/services/progress/toRuleQuests";
import { SettingsService } from "../../src/main/services/settings/SettingsService";
import { RunRegistry } from "../../src/main/services/unreal/RunRegistry";
import { FakeSecretEncryptor, FakeSettingsChecks, MemorySettingsStore } from "../settings/settingsFakes";
import { createTestProgressContent, fixtureContent } from "../support/contentFixture";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

const seerStones = new SeerStoneRules();
const now = localMoment(2026, 10, 21);
const firstQuest = makeQuest({ id: "q1", xp: 100 });
const quests = [firstQuest];
const failedSubmit = { quest: firstQuest, score: 30, passed: false, compiled: false, isSubmit: true };

/** Right answers to the fixture concept quest, in question order. */
const RIGHT_CONCEPT_ANSWERS: ItemResponse[] = [
	{ kind: "choice", choice: "1" },
	{ kind: "text", text: "uproperty" },
	{ kind: "choice", choice: "observer" },
	{ kind: "choice", choice: "2" },
	{ kind: "text", text: "It does a." },
];

/** A solution source holding the fixture build quest's file and a test file the learner never edits. */
const FIXTURE_SOLUTIONS: SolutionSource = {
	filesOf: async (questId) => (questId === "w1-build" ? { "Thing.h": "#pragma once\nstruct Thing {};", "w1-build.Test.cpp": "// test" } : null),
};

/** The handler table on the fixture content, with a Seer Stone held and the given solutions. */
function handlerStack(solutions: SolutionSource = FIXTURE_SOLUTIONS, stones = 1)
{
	const stack = createTestProgressContent({ solutions, prepare: (progress) => { progress.seerStones = stones; } });
	const dependencies: HandlerDependencies = {
		getAppVersion: () => "1.0.0",
		getEngineLocator: () => { throw new Error("not used"); },
		getContentCatalog: () => stack.catalog,
		pickFolder: async () => null,
		progressService: stack.service,
		progressContentService: stack.content,
		getSandboxService: () => { throw new Error("not used"); },
		getQuestRunService: () => { throw new Error("not used"); },
		getEditorService: () => { throw new Error("not used"); },
		runRegistry: new RunRegistry(),
		sendProgress: () => undefined,
		settingsService: new SettingsService(new MemorySettingsStore(), new FakeSecretEncryptor(), new FakeSettingsChecks()),
		readEnvironmentStatus: () => { throw new Error("not used"); },
		getReviewHandlers: () => { throw new Error("not used"); },
	};

	return { ...stack, handlers: createHandlers(dependencies) };
}

/** Opens the fixture build quest (its concept passed) and fails two submits on it. */
async function failBuildTwice(stack: ReturnType<typeof handlerStack>): Promise<void>
{
	await stack.handlers.submitConcept.handle({ questId: "w1-concept", prediction: null, answers: RIGHT_CONCEPT_ANSWERS });

	const rule = toRuleQuests(toPackOutlines(fixtureContent().packs));
	const build = rule.find((quest) => quest.id === "w1-build");
	if (!build) throw new Error("expected the build quest");

	await stack.service.recordAttempt({ quest: build, score: 20, passed: false, compiled: true, isSubmit: true }, rule);
	await stack.service.recordAttempt({ quest: build, score: 30, passed: false, compiled: true, isSubmit: true }, rule);
}

describe("SeerStoneRules pricing (A1391)", () =>
{
	it("spends a stone on a first view when asked and one is held, and schedules the rematch 3 days out", () =>
	{
		expect(seerStones.viewSolution({ stonesHeld: 2, spendStone: true, alreadyViewed: false, passed: false, now })).toEqual({ stonesAfter: 1, stoneSpent: true, rematchDueAt: localMoment(2026, 10, 24).toISOString(), alreadyViewed: false });
	});

	it("pays with XP when no stone is spent, still scheduling the rematch", () =>
	{
		expect(seerStones.viewSolution({ stonesHeld: 2, spendStone: false, alreadyViewed: false, passed: false, now })).toMatchObject({ stonesAfter: 2, stoneSpent: false, rematchDueAt: localMoment(2026, 10, 24).toISOString() });
	});

	it("makes a repeat view free and schedules nothing", () =>
	{
		expect(seerStones.viewSolution({ stonesHeld: 1, spendStone: true, alreadyViewed: true, passed: false, now })).toEqual({ stonesAfter: 1, stoneSpent: false, rematchDueAt: null, alreadyViewed: true });
	});

	it("makes a passed quest's view free and schedules no rematch, so a view never buys rematch XP", () =>
	{
		expect(seerStones.viewSolution({ stonesHeld: 1, spendStone: true, alreadyViewed: false, passed: true, now })).toEqual({ stonesAfter: 1, stoneSpent: false, rematchDueAt: null, alreadyViewed: false });
	});
});

describe("ProgressService.viewSolution", () =>
{
	it("refuses to spend a stone that is not held and writes nothing", async () =>
	{
		const { service } = createTestProgressService();
		await service.recordAttempt(failedSubmit, quests);
		await service.recordAttempt(failedSubmit, quests);
		const before = structuredClone(service.getProgress());

		await expect(service.viewSolution("q1", true)).rejects.toMatchObject({ appError: { code: "invalid-payload", message: "You hold no Seer Stone." } });
		expect(service.getProgress()).toEqual(before);
	});

	it("keeps the first price on a repeat view: no new rematch date and no stone spent", async () =>
	{
		const { service, clock } = createTestProgressService(now, [0], (progress) => { progress.seerStones = 1; });
		await service.recordAttempt(failedSubmit, quests);
		await service.recordAttempt(failedSubmit, quests);
		const first = await service.viewSolution("q1", false);

		clock.advanceDays(1);
		const repeat = await service.viewSolution("q1", true);

		expect(repeat).toEqual({ stonesAfter: 1, stoneSpent: false, rematchDueAt: null, alreadyViewed: true });
		expect(service.getProgress().rematches).toEqual({ q1: first.rematchDueAt });
		expect(service.getProgress().quests["q1"]).toMatchObject({ solutionViewed: true, seerStoneSpent: false });
	});

	it("pays a Seer Stone view's first pass in full even on or after the rematch date (fix round 1)", async () =>
	{
		const { service, clock } = createTestProgressService(now, [0], (progress) => { progress.seerStones = 1; });
		await service.recordAttempt(failedSubmit, quests);
		await service.recordAttempt(failedSubmit, quests);
		await service.viewSolution("q1", true);

		clock.advanceDays(4);
		const pass = await service.recordAttempt({ ...failedSubmit, score: 90, passed: true, compiled: true }, quests);

		expect(pass.xp.firstPass).toBe(100);
	});

	it("pays an XP-paid view's first pass 50% once the rematch is due, and 0 before", async () =>
	{
		const early = createTestProgressService();
		const late = createTestProgressService();

		for (const { service } of [early, late])
		{
			await service.recordAttempt(failedSubmit, quests);
			await service.recordAttempt(failedSubmit, quests);
			await service.viewSolution("q1", false);
		}

		early.clock.advanceDays(1);
		late.clock.advanceDays(4);

		expect((await early.service.recordAttempt({ ...failedSubmit, score: 90, passed: true, compiled: true }, quests)).xp.firstPass).toBe(0);
		expect((await late.service.recordAttempt({ ...failedSubmit, score: 90, passed: true, compiled: true }, quests)).xp.firstPass).toBe(50);
	});

	it("never schedules a rematch for a passed quest, closing pass, view, rematch farming", async () =>
	{
		const { service, clock } = createTestProgressService();
		await service.recordAttempt({ ...failedSubmit, score: 90, passed: true, compiled: true }, quests);

		const view = await service.viewSolution("q1", false);
		clock.advanceDays(3);
		const again = await service.recordAttempt({ ...failedSubmit, score: 95, passed: true, compiled: true }, quests);

		expect(view.rematchDueAt).toBeNull();
		expect(service.getProgress().rematches).toEqual({});
		expect(again.xp.total).toBe(0);
	});
});

describe("ProgressContentService.viewSolution through the handler (A1390)", () =>
{
	it("answers only the quest's own files, spends the stone, and keeps the quest's XP", async () =>
	{
		const stack = handlerStack();
		await failBuildTwice(stack);

		const viewing = await stack.handlers.viewSolution.handle("w1-build", true);

		expect(viewing).toEqual({ questId: "w1-build", files: { "Thing.h": "#pragma once\nstruct Thing {};" }, stoneSpent: true, seerStonesAfter: 0, xpForfeited: false, rematchDueAt: localMoment(2026, 10, 24, 9).toISOString(), alreadyViewed: false });
		expect(stack.service.getProgress().seerStones).toBe(0);
	});

	it("marks the XP forfeited when paid with XP, and a repeat view says so again for free", async () =>
	{
		const stack = handlerStack();
		await failBuildTwice(stack);

		expect(await stack.handlers.viewSolution.handle("w1-build", false)).toMatchObject({ stoneSpent: false, seerStonesAfter: 1, xpForfeited: true, alreadyViewed: false });
		expect(await stack.handlers.viewSolution.handle("w1-build", true)).toMatchObject({ stoneSpent: false, seerStonesAfter: 1, xpForfeited: true, alreadyViewed: true, rematchDueAt: null });
	});

	it("refuses a locked quest, a concept quest, and a quest with no solution, charging nothing", async () =>
	{
		const stack = handlerStack({ filesOf: async () => null });

		await expect(stack.handlers.viewSolution.handle("w1-build", true)).rejects.toMatchObject({ appError: { code: "quest-locked" } });
		await failBuildTwice(stack);
		await expect(stack.handlers.viewSolution.handle("w1-concept", false)).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		await expect(stack.handlers.viewSolution.handle("w1-build", true)).rejects.toMatchObject({ appError: { code: "invalid-payload", message: "This quest has no reference solution to show." } });

		expect(stack.service.getProgress().seerStones).toBe(1);
		expect(stack.service.getProgress().quests["w1-build"]?.solutionViewed).toBe(false);
	});
});

describe("SolutionFolderReader", () =>
{
	let folder = "";

	afterEach(async () =>
	{
		if (folder) await rm(folder, { recursive: true, force: true });
	});

	it("reads the files directly in the quest's folder in name order, leaving sub folders out", async () =>
	{
		folder = await mkdtemp(join(tmpdir(), "dojo-solutions-"));
		await mkdir(join(folder, "q1", "piece"), { recursive: true });
		await writeFile(join(folder, "q1", "B.cpp"), "b");
		await writeFile(join(folder, "q1", "A.h"), "a");
		await writeFile(join(folder, "q1", "piece", "C.h"), "c");
		await mkdir(join(folder, "empty"));

		const reader = new SolutionFolderReader(folder);
		const files = await reader.filesOf("q1");

		expect(Object.keys(files ?? {})).toEqual(["A.h", "B.cpp"]);
		expect(files).toEqual({ "A.h": "a", "B.cpp": "b" });
		expect(await reader.filesOf("missing")).toBeNull();
		expect(await reader.filesOf("empty")).toBeNull();
		expect(await reader.filesOf("../q1")).toBeNull();
		expect(await reader.filesOf("..")).toBeNull();
	});
});

describe("Daily quest offers and today's chest", () =>
{
	const daily = new DailyQuestService();
	const empty = { date: "2026-10-20", offered: [], done: false, monthBadges: [], completedDates: [] };

	it("leaves the drill offer out when nothing is scheduled due today, since that drill could never finish the daily quest (A1393)", () =>
	{
		const state = daily.refresh(empty, now, { conceptQuestIds: ["concept-a"], shortBuildQuestIds: ["build-a"], hasDueDrillItems: false }, new SequenceRandom([0]));

		expect(state.offered).toEqual([{ kind: "concept", questId: "concept-a" }, { kind: "build", questId: "build-a" }]);
	});

	it("keeps today's chest in the daily state and starts a new day without it (A1394)", async () =>
	{
		// Random 0.5 rolls the third of the five rewards, a Seer Stone.
		const { service, clock } = createTestProgressService(now, [0.5]);
		await service.getDailyQuest({ conceptQuestIds: [], shortBuildQuestIds: [], hasDueDrillItems: true });
		await service.chooseDailyOffer(0);

		const outcome = await service.finishDrill({ correctCount: 6, totalCount: 6 });

		expect(outcome.chest).toBe("seer-stone");
		expect(service.getProgress().daily).toMatchObject({ done: true, chest: "seer-stone" });

		clock.advanceDays(1);
		const tomorrow = await service.getDailyQuest({ conceptQuestIds: [], shortBuildQuestIds: [], hasDueDrillItems: true });

		expect(tomorrow.chest).toBeUndefined();
		expect(tomorrow.done).toBe(false);
	});

	it("keeps the chest a passed concept quest earns from a chosen concept offer", async () =>
	{
		const stack = createTestProgressContent({ random: [0, 0] });
		const today = await stack.content.getDailyQuest();
		const conceptIndex = today.offered.findIndex((offer) => offer.kind === "concept");

		await stack.service.chooseDailyOffer(conceptIndex);
		const { outcome } = await stack.content.submitConcept({ questId: "w1-concept", prediction: null, answers: RIGHT_CONCEPT_ANSWERS });

		expect(outcome.chest).toBe("freeze");
		expect(stack.service.getProgress().daily.chest).toBe("freeze");
	});

	it("offers no drill on a fresh learner's first day, when nothing is scheduled yet", async () =>
	{
		const stack = createTestProgressContent();

		expect((await stack.content.getDailyQuest()).offered.map((offer) => offer.kind)).toEqual(["concept"]);
	});
});
