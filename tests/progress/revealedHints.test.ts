// Revealed hint spells survive a restart, come back with the quest, and are never charged twice (M1.6c, A500 to A503).
import { describe, expect, it } from "vitest";

import { ContentCatalog } from "../../src/main/content/ContentCatalog";
import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { migrateSave } from "../../src/main/services/progress/migrateSave";
import { ProgressContentService } from "../../src/main/services/progress/ProgressContentService";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";
import { toRuleQuests } from "../../src/main/services/progress/toRuleQuests";
import { toPackOutlines } from "../../src/main/content/contentViews";
import { fakeGraders, fixtureContent } from "../support/contentFixture";
import { FixedClock } from "../support/FixedClock";
import { MemoryFileSystem } from "../support/MemoryFileSystem";
import { localMoment } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

/** One app start on a shared in-memory disk: the save is loaded from it like the real app does at launch. */
async function startApp(fileSystem: MemoryFileSystem, clock: FixedClock)
{
	const store = new ProgressStore(fileSystem, "/user-data");
	const service = await ProgressService.openOrRefuse(store, clock, new SequenceRandom());
	const content = fixtureContent();
	const catalog = new ContentCatalog({ root: "/fixture", folderExists: async () => true, loadContent: async () => content });
	const progressContent = new ProgressContentService(catalog, service, fakeGraders(), new SequenceRandom(), () => "session");

	return { service, progressContent };
}

/** Passes the fixture concept quest and reviews its terms, as submitConcept does, so the build quest opens. */
async function openBuildQuest(service: ProgressService)
{
	const quests = toRuleQuests(toPackOutlines(fixtureContent().packs));
	const concept = quests.find((quest) => quest.id === "w1-concept");
	if (!concept) throw new Error("expected the concept quest");

	const itemReviews = concept.terms.map((itemId) => ({ itemId, quality: 5 }));
	await service.recordAttempt({ quest: concept, score: 100, passed: true, compiled: true, isSubmit: false, itemReviews }, quests);

	return quests;
}

describe("revealed hints", () =>
{
	it("keeps revealed hints across a restart, returns their texts with the quest, and never charges twice", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		const clock = new FixedClock(localMoment(2026, 10, 21, 9));
		const first = await startApp(fileSystem, clock);
		await openBuildQuest(first.service);

		expect(await first.progressContent.getQuest("w1-build")).toMatchObject({ hintCount: 3, revealedHints: [] });

		await first.progressContent.revealHint("w1-build");
		await first.progressContent.revealHint("w1-build");

		// Restart: a new service reads the save from disk.
		const second = await startApp(fileSystem, clock);
		const quest = await second.progressContent.getQuest("w1-build");

		expect(quest).toMatchObject({ revealedHints: ["First hint.", "Second hint."] });
		expect(quest).not.toHaveProperty("hints");
		expect(second.service.getProgress().quests["w1-build"]).toMatchObject({ revealedHints: [0, 1], hintsRevealed: 2 });

		// Asking again for a revealed hint answers it for free.
		expect(await second.progressContent.revealHint("w1-build", 0)).toEqual({ hintIndex: 0, text: "First hint.", xpCost: 15, hintsRevealed: 2, alreadyRevealed: true });
		expect(second.service.getProgress().quests["w1-build"]?.hintsRevealed).toBe(2);

		// The pass is charged for two hints, not three.
		const quests = toRuleQuests(toPackOutlines(fixtureContent().packs));
		const build = quests.find((candidate) => candidate.id === "w1-build");
		if (!build) throw new Error("expected the build quest");
		const outcome = await second.service.recordAttempt({ quest: build, score: 90, passed: true, compiled: true, isSubmit: true }, quests);

		expect(outcome.xp.hintCost).toBe(-30);
	});

	it("returns revealed hint texts in getWorld too, and nothing for quests without hints", async () =>
	{
		const { service, progressContent } = await startApp(new MemoryFileSystem(), new FixedClock(localMoment(2026, 10, 21, 9)));
		await openBuildQuest(service);
		await progressContent.revealHint("w1-build", 0);

		const world = await progressContent.getWorld("world-1");
		const build = world.quests.find((quest) => quest.id === "w1-build");
		const concept = world.quests.find((quest) => quest.id === "w1-concept");

		expect(build).toMatchObject({ revealedHints: ["First hint."] });
		expect(concept).not.toHaveProperty("revealedHints");
	});

	it("reveals in order: the next index costs once, a skipped index is refused, and no index means the next", async () =>
	{
		const { service, progressContent } = await startApp(new MemoryFileSystem(), new FixedClock(localMoment(2026, 10, 21, 9)));
		await openBuildQuest(service);

		await expect(progressContent.revealHint("w1-build", 1)).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
		expect(await progressContent.revealHint("w1-build", 0)).toMatchObject({ hintIndex: 0, alreadyRevealed: false, hintsRevealed: 1 });
		expect(await progressContent.revealHint("w1-build")).toMatchObject({ hintIndex: 1, alreadyRevealed: false, hintsRevealed: 2 });
		expect(await progressContent.revealHint("w1-build", 1)).toMatchObject({ hintIndex: 1, alreadyRevealed: true, hintsRevealed: 2 });
		expect(service.getProgress().quests["w1-build"]?.revealedHints).toEqual([0, 1]);
	});
});

describe("save migration from version 1", () =>
{
	/** A version 1 save: quests count revealed hints but have no `revealedHints` list. */
	function versionOneSave()
	{
		const save = createNewProgress(localMoment(2026, 10, 21)) as unknown as Record<string, unknown>;
		save.version = 1;
		save.quests = {
			"w1-build": { status: "in_progress", bestScore: null, attempts: 1, hintsRevealed: 2, solutionViewed: false, seerStoneSpent: false, effortXpGranted: false, savedFiles: {}, lastAttemptAt: null },
			"w1-concept": { status: "passed", bestScore: 100, attempts: 1, hintsRevealed: 0, solutionViewed: false, seerStoneSpent: false, effortXpGranted: false, savedFiles: {}, lastAttemptAt: null },
		};

		return save;
	}

	it("fills revealedHints with the first hintsRevealed indexes and moves the save to version 2", () =>
	{
		const migrated = migrateSave(versionOneSave()) as { version: number; quests: Record<string, { revealedHints: number[] }> };

		expect(migrated.version).toBe(2);
		expect(migrated.quests["w1-build"]?.revealedHints).toEqual([0, 1]);
		expect(migrated.quests["w1-concept"]?.revealedHints).toEqual([]);
	});

	it("loads a version 1 save from disk, and writes it back as version 2", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		fileSystem.files.set("/user-data/progress.json", JSON.stringify(versionOneSave()));
		const store = new ProgressStore(fileSystem, "/user-data");

		const loaded = await store.load(localMoment(2026, 10, 21));
		expect(loaded.recovery).toBe("none");
		expect(loaded.progress.version).toBe(2);
		expect(loaded.progress.quests["w1-build"]).toMatchObject({ hintsRevealed: 2, revealedHints: [0, 1] });

		await store.save(loaded.progress);
		expect(JSON.parse(fileSystem.files.get("/user-data/progress.json") ?? "{}").version).toBe(2);
	});

	it("leaves a current save and anything that is not a save unchanged", () =>
	{
		const current = createNewProgress(localMoment(2026, 10, 21));

		expect(migrateSave(current)).toBe(current);
		expect(migrateSave("not a save")).toBe("not a save");
		expect(migrateSave({ version: 7 })).toEqual({ version: 7 });
	});
});

describe("revealed hints on a refused save", () =>
{
	it("still answers getQuest and getWorld, with no revealed hints, when the save could not be opened (A133)", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		fileSystem.files.set("/user-data/progress.json", JSON.stringify({ version: 99 }));
		const { service, progressContent } = await startApp(fileSystem, new FixedClock(localMoment(2026, 10, 21, 9)));

		expect(service.getRefusal()?.code).toBe("save-failed");
		expect(await progressContent.getQuest("w1-build")).toMatchObject({ id: "w1-build", hintCount: 3, revealedHints: [] });

		const world = await progressContent.getWorld("world-1");
		expect(world.quests.find((quest) => quest.id === "w1-build")).toMatchObject({ revealedHints: [] });
		expect(world.quests.map((quest) => quest.id)).toEqual(["w1-concept", "w1-build", "w1-breakdown", "w1-boss"]);
		expect(service.getRevealedHintIndexes("w1-build")).toEqual([]);
	});
});

