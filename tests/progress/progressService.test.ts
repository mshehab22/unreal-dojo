// The progress service end to end on an in-memory disk: attempts and loot, hints, Seer Stone, reviews, drills, daily quest, and saving.
import { describe, expect, it } from "vitest";

import { createRulesSnapshot } from "../../src/main/services/progress/rules";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";

const firstQuest = makeQuest({ id: "q1", title: "Hello Actor", patterns: ["component"], skills: ["ue.objects"], difficulty: 1, xp: 100 });
const secondQuest = makeQuest({ id: "q2", title: "Health", order: 2, prerequisites: ["q1"], skills: ["ue.objects"] });
const bossQuest = makeQuest({ id: "boss1", title: "Boss", kind: "boss", order: 3, difficulty: 2, xp: 300, skills: ["ue.objects"] });
const quests = [firstQuest, secondQuest, bossQuest];

describe("ProgressService attempts", () =>
{
	it("records a first-try pass with XP, card, skill, spree, streak, unlocks, and saves it", async () =>
	{
		const { service, fileSystem } = createTestProgressService();

		const outcome = await service.recordAttempt({ quest: firstQuest, score: 90, passed: true, compiled: true, isSubmit: true }, quests);

		expect(outcome.xp.total).toBe(100);
		expect(outcome.cardChanges).toEqual([{ patternId: "component", tierBefore: null, tierAfter: "bronze" }]);
		expect(outcome.skillChanges).toEqual([{ skillId: "ue.objects", pointsGained: 1, masteryBefore: null, masteryAfter: "attempted" }]);
		expect(outcome.spree).toEqual({ current: 1, best: 1, armorUsed: false });
		expect(outcome.streak.count).toBe(1);
		expect(outcome.unlockedQuestIds).toEqual(["q2"]);
		expect(JSON.parse(fileSystem.files.get("/user-data/progress.json") ?? "{}").xp).toBe(100);
	});

	it("pays nothing for a repeat and does not add skill points again", async () =>
	{
		const { service } = createTestProgressService();
		await service.recordAttempt({ quest: firstQuest, score: 90, passed: true, compiled: true, isSubmit: true }, quests);

		const repeat = await service.recordAttempt({ quest: firstQuest, score: 100, passed: true, compiled: true, isSubmit: true }, quests);

		expect(repeat.xp.total).toBe(0);
		expect(repeat.skillChanges).toEqual([]);
		expect(service.getProgress().quests["q1"]?.bestScore).toBe(100);
	});

	it("pays effort XP once for a failed compiled submit and resets the spree", async () =>
	{
		const { service } = createTestProgressService();

		const first = await service.recordAttempt({ quest: firstQuest, score: 40, passed: false, compiled: true, isSubmit: true }, quests);
		const second = await service.recordAttempt({ quest: firstQuest, score: 45, passed: false, compiled: true, isSubmit: true }, quests);

		expect(first.xp.effort).toBe(5);
		expect(second.xp.total).toBe(0);
		expect(service.getProgress().quests["q1"]?.status).toBe("in_progress");
	});

	it("rewards a first boss pass with a freeze, armor, doubled skill points, and a studio module", async () =>
	{
		const { service } = createTestProgressService();

		const outcome = await service.recordAttempt({ quest: bossQuest, score: 80, passed: true, compiled: true, isSubmit: true }, quests);
		const progress = service.getProgress();

		expect(outcome.skillChanges[0]?.pointsGained).toBe(4);
		expect(progress.streak.freezes).toBe(1);
		expect(progress.spree.armor).toBe(1);
		expect(progress.studio.modules).toEqual(["boss1"]);
	});

	it("tracks level and role changes", async () =>
	{
		const { service } = createTestProgressService();
		const bigQuest = makeQuest({ id: "big", xp: 500, difficulty: 1 });

		const outcome = await service.recordAttempt({ quest: bigQuest, score: 90, passed: true, compiled: true, isSubmit: true }, [bigQuest]);

		expect(outcome.level).toEqual({ before: 1, after: 3 });
		expect(outcome.role).toEqual({ before: "Apprentice", after: "Apprentice" });
	});
});

describe("ProgressService hints and Seer Stone", () =>
{
	it("reveals hints in order at 15% of base each, then refuses a fourth", async () =>
	{
		const { service } = createTestProgressService();
		const hints = ["one", "two", "three"];

		expect(await service.revealHint(firstQuest, hints)).toEqual({ hintIndex: 0, text: "one", xpCost: 15, hintsRevealed: 1 });
		await service.revealHint(firstQuest, hints);
		await service.revealHint(firstQuest, hints);
		await expect(service.revealHint(firstQuest, hints)).rejects.toMatchObject({ appError: { code: "invalid-payload" } });
	});

	it("offers the solution only after two failed submits", async () =>
	{
		const { service } = createTestProgressService();

		await expect(service.viewSolution("q1", false)).rejects.toMatchObject({ appError: { code: "quest-locked" } });
	});

	it("zeroes the quest's XP without a stone and pays 50% at the rematch within 3 days", async () =>
	{
		const { service, clock } = createTestProgressService();
		const fail = { quest: firstQuest, score: 30, passed: false, compiled: false, isSubmit: true };
		await service.recordAttempt(fail, quests);
		await service.recordAttempt(fail, quests);

		const view = await service.viewSolution("q1", false);
		expect(view.stoneSpent).toBe(false);
		expect(view.rematchDueAt).toBe(localMoment(2026, 10, 24).toISOString());

		const pass = await service.recordAttempt({ ...fail, score: 90, passed: true, compiled: true }, quests);
		expect(pass.xp.total).toBe(0);

		clock.advanceDays(3);
		const rematch = await service.recordAttempt({ ...fail, score: 90, passed: true, compiled: true }, quests);
		expect(rematch.xp.total).toBe(50);
		expect(service.getProgress().rematches).toEqual({});
	});

	it("keeps the quest's XP when a Seer Stone is spent", async () =>
	{
		// Random 0.5 makes the daily chest a Seer Stone (third of five possible rewards).
		const { service } = createTestProgressService(localMoment(2026, 10, 21), [0.5]);
		await service.getDailyQuest({ conceptQuestIds: [], shortBuildQuestIds: [] });
		await service.chooseDailyOffer(0);
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 }, [])).chest).toBe("seer-stone");

		const fail = { quest: firstQuest, score: 30, passed: false, compiled: false, isSubmit: true };
		await service.recordAttempt(fail, quests);
		await service.recordAttempt(fail, quests);

		const view = await service.viewSolution("q1", true);
		expect(view).toMatchObject({ stoneSpent: true, stonesAfter: 0 });

		const pass = await service.recordAttempt({ ...fail, score: 90, passed: true, compiled: true }, quests);
		expect(pass.xp.total).toBe(100);
	});
});

describe("ProgressService reviews and drills", () =>
{
	it("reviews an item: schedules it, logs it, and reports a skill mastery change", async () =>
	{
		const { service } = createTestProgressService();

		const first = await service.reviewItem("term.uobject", 4, { skillId: "ue.objects", earnedInWorldId: "world-1" });
		expect(first.correct).toBe(true);
		expect(first.masteryChange).toEqual({ skillId: "ue.objects", before: "attempted", after: "familiar" });

		const miss = await service.reviewItem("term.uobject", 1);
		expect(miss.masteryChange).toEqual({ skillId: "ue.objects", before: "familiar", after: "attempted" });

		const progress = service.getProgress();
		expect(progress.reviewLog).toHaveLength(2);
		expect(progress.memory["term.uobject"]?.earnedInWorldId).toBe("world-1");
		expect(progress.schedule["term.uobject"]).toBe(miss.nextDueAt);
	});

	it("removes a Drill me item from the queue once it is reviewed, and keeps one entry per item", async () =>
	{
		const { service } = createTestProgressService();
		await service.queueDrillItem("pattern.observer");
		await service.queueDrillItem("pattern.observer");
		expect(service.getProgress().drillQueue).toEqual(["pattern.observer"]);
		expect(service.getDueItemIds()).toEqual(["pattern.observer"]);

		await service.reviewItem("pattern.observer", 4);
		expect(service.getProgress().drillQueue).toEqual([]);
	});

	it("injects a term after three hovers", async () =>
	{
		const { service } = createTestProgressService();
		await service.recordTermHover("term.tick");
		await service.recordTermHover("term.tick");
		expect(service.getDrillSummary().dueToday).toBe(0);

		await service.recordTermHover("term.tick");
		expect(service.getDrillSummary().dueToday).toBe(1);
	});

	it("finishes a drill with flat XP, the streak, and a world test-out once every term is proficient", async () =>
	{
		const { service, clock } = createTestProgressService();
		const termQuest = makeQuest({ id: "t1", terms: ["term.a"] });

		for (let day = 0; day < 3; day++)
		{
			await service.reviewItem("term.a", 5);
			clock.advanceDays(1);
		}

		const outcome = await service.finishDrill({ correctCount: 6, totalCount: 7 }, [termQuest]);

		expect(outcome.xpGained).toBe(10);
		expect(outcome.streak.count).toBe(1);
		expect(outcome.testedOutWorldIds).toEqual(["world-1"]);
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 }, [termQuest])).testedOutWorldIds).toEqual([]);
	});
});

describe("ProgressService daily quest and settings", () =>
{
	it("refreshes offers, takes one choice, and gives a chest when the chosen drill is finished", async () =>
	{
		const { service } = createTestProgressService(localMoment(2026, 10, 21), [0]);
		const state = await service.getDailyQuest({ conceptQuestIds: ["q1"], shortBuildQuestIds: [] });

		expect(state.offered.map((offer) => offer.kind)).toEqual(["drill", "concept"]);

		await service.chooseDailyOffer(0);
		await expect(service.chooseDailyOffer(1)).rejects.toMatchObject({ appError: { code: "invalid-payload" } });

		const outcome = await service.finishDrill({ correctCount: 6, totalCount: 6 }, []);
		expect(outcome.chest).toBe("freeze");
		expect(service.getProgress().streak.freezes).toBe(1);
	});

	it("saves drafts and resets them without touching the score", async () =>
	{
		const { service } = createTestProgressService();
		await service.saveQuestDraft({ questId: "q1", files: { "Health.cpp": "// mine" } });
		expect(service.getProgress().quests["q1"]).toMatchObject({ status: "in_progress", savedFiles: { "Health.cpp": "// mine" } });

		const reset = await service.resetQuest("q1");
		expect(reset.savedFiles).toEqual({});
		expect(reset.status).toBe("in_progress");
	});

	it("sets the name, resets everything, and serves the rules snapshot", async () =>
	{
		const { service } = createTestProgressService();

		expect((await service.setPlayerName("Mohammad")).playerName).toBe("Mohammad");
		expect((await service.resetProgress()).playerName).toBe("");
		expect(service.getRules()).toEqual(createRulesSnapshot());
	});
});
