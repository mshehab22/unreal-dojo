// The progress service end to end on an in-memory disk: attempts and loot, hints, Seer Stone, reviews, drills, daily quest, and saving.
import { describe, expect, it } from "vitest";

import { AppErrorException } from "../../src/main/errors/AppErrorException";
import { ProgressService } from "../../src/main/services/progress/ProgressService";
import { ProgressStore } from "../../src/main/services/progress/ProgressStore";

import { createRulesSnapshot, HOVER_INJECTION_THRESHOLD, MASTERY_THRESHOLDS, STUDIO_COSMETICS } from "../../src/main/services/progress/rules";
import { FixedClock } from "../support/FixedClock";
import { MemoryFileSystem } from "../support/MemoryFileSystem";
import { createTestProgressService, localMoment, makeQuest } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

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

		expect(await service.revealHint(firstQuest, hints)).toEqual({ hintIndex: 0, text: "one", xpCost: 15, hintsRevealed: 1, alreadyRevealed: false });
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
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 })).chest).toBe("seer-stone");

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

	it("finishes a drill with flat XP, the streak, and tests a world out from its test-out drill once every term is proficient", async () =>
	{
		const { service, clock } = createTestProgressService();
		const termQuest = makeQuest({ id: "t1", terms: ["term.a"] });

		// Spaced recalls on their due days: day 0, then 1 day later, then 3 days after that.
		for (const gapDays of [1, 3, 0])
		{
			await service.reviewItem("term.a", 5);
			clock.advanceDays(gapDays);
		}

		// A due drill never tests a world out; only a test-out drill for that world does (A313).
		expect((await service.finishDrill({ correctCount: 6, totalCount: 7 })).testedOutWorldIds).toEqual([]);

		const outcome = await service.finishDrill({ correctCount: 6, totalCount: 7 }, { rewarded: true, testOut: { worldId: "world-1", termIds: termQuest.terms } });

		expect(outcome.xpGained).toBe(10);
		expect(outcome.streak.count).toBe(1);
		expect(outcome.testedOutWorldIds).toEqual(["world-1"]);
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 }, { rewarded: true, testOut: { worldId: "world-1", termIds: termQuest.terms } })).testedOutWorldIds).toEqual([]);
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

		const outcome = await service.finishDrill({ correctCount: 6, totalCount: 6 });
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
		expect(service.getRules()).toMatchObject({ masteryThresholds: MASTERY_THRESHOLDS, hoverInjectionThreshold: HOVER_INJECTION_THRESHOLD, effortShare: 0.05, studioCosmetics: STUDIO_COSMETICS });
	});
});

describe("ProgressService fix round 1", () =>
{
	it("never loses an update when calls overlap (a hover during an attempt's save)", async () =>
	{
		const { service } = createTestProgressService();

		await Promise.all([
			service.recordAttempt({ quest: firstQuest, score: 90, passed: true, compiled: true, isSubmit: true }, quests),
			service.recordTermHover("term.tick"),
			service.setPlayerName("Mohammad"),
		]);

		const progress = service.getProgress();
		expect(progress.xp).toBe(100);
		expect(progress.quests["q1"]?.status).toBe("passed");
		expect(progress.hoverCounts["term.tick"]).toBe(1);
		expect(progress.playerName).toBe("Mohammad");
	});

	it("keeps the queue running after a failed step", async () =>
	{
		const { service } = createTestProgressService();

		const results = await Promise.allSettled([service.viewSolution("q1", false), service.recordTermHover("term.tick")]);

		expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
		expect(service.getProgress().hoverCounts["term.tick"]).toBe(1);
	});

	it("surfaces a due item as a rematch in another world, pays 50% once, reschedules the item, and pays 0 on a second replay that day", async () =>
	{
		const { service, clock } = createTestProgressService(localMoment(2026, 10, 21, 9));
		const earned = makeQuest({ id: "earned", patterns: ["observer"], worldId: "world-1", order: 1 });
		const elsewhere = makeQuest({ id: "elsewhere", patterns: ["observer"], worldId: "world-2", worldOrder: 2, order: 1, xp: 100 });
		const map = [earned, elsewhere];

		await service.recordAttempt({ quest: earned, score: 90, passed: true, compiled: true, isSubmit: false }, map);
		await service.recordAttempt({ quest: elsewhere, score: 90, passed: true, compiled: true, isSubmit: false }, map);
		await service.reviewItem("observer", 4, { earnedInWorldId: "world-1" });

		clock.advanceDays(1);
		const availability = await service.getQuestAvailability(map);
		expect(availability["elsewhere"]?.dueForRematch).toBe(true);
		expect(availability["earned"]?.dueForRematch).toBe(false);

		const rematch = await service.recordAttempt({ quest: elsewhere, score: 90, passed: true, compiled: true, isSubmit: false }, map);
		expect(rematch.xp.total).toBe(50);
		expect(new Date(service.getProgress().schedule["observer"] ?? "").getTime()).toBeGreaterThan(clock.now().getTime());

		const reloaded = await service.getQuestAvailability(map);
		expect(reloaded["elsewhere"]?.dueForRematch).toBe(false);

		const secondReplay = await service.recordAttempt({ quest: elsewhere, score: 95, passed: true, compiled: true, isSubmit: false }, map);
		expect(secondReplay.xp.total).toBe(0);
	});

	it("does not reach proficient from three reviews at the same moment", async () =>
	{
		const { service } = createTestProgressService();

		await service.reviewItem("term.a", 5);
		await service.reviewItem("term.a", 5);
		await service.reviewItem("term.a", 5);

		const progress = service.getProgress();
		expect(progress.memory["term.a"]?.mastery).toBe("familiar");
		expect(progress.reviewLog).toHaveLength(3);
	});

	it("pays no effort XP for a failed concept quest", async () =>
	{
		const { service } = createTestProgressService();
		const concept = makeQuest({ id: "c1", kind: "concept" });

		expect((await service.recordAttempt({ quest: concept, score: 60, passed: false, compiled: true, isSubmit: false }, [concept])).xp.total).toBe(0);
	});

	it("applies each chest reward: freeze, armor, Seer Stone, studio cosmetic, and an XP potion that lasts 30 minutes", async () =>
	{
		const rewards: [number, (progress: ReturnType<typeof createTestProgressService>["service"]) => unknown, unknown][] = [
			[0, (service) => service.getProgress().streak.freezes, 1],
			[0.2, (service) => service.getProgress().spree.armor, 1],
			[0.4, (service) => service.getProgress().seerStones, 1],
			[0.6, (service) => service.getProgress().studio.cosmetics, [STUDIO_COSMETICS[0]]],
			[0.8, (service) => service.getProgress().xpPotionUntil, localMoment(2026, 10, 21, 12, 30).toISOString()],
		];

		for (const [roll, read, expected] of rewards)
		{
			const { service } = createTestProgressService(localMoment(2026, 10, 21), [roll]);
			await service.getDailyQuest({ conceptQuestIds: [], shortBuildQuestIds: [] });
			await service.chooseDailyOffer(0);
			await service.finishDrill({ correctCount: 6, totalCount: 6 });

			expect(read(service)).toEqual(expected);
		}
	});

	it("doubles nothing after the potion's 30 minutes are up", async () =>
	{
		const { service, clock } = createTestProgressService(localMoment(2026, 10, 21), [0.8]);
		await service.getDailyQuest({ conceptQuestIds: [], shortBuildQuestIds: [] });
		await service.chooseDailyOffer(0);
		await service.finishDrill({ correctCount: 6, totalCount: 6 });

		clock.set(localMoment(2026, 10, 21, 12, 29));
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 })).xpGained).toBe(15);

		clock.set(localMoment(2026, 10, 21, 12, 30));
		expect((await service.finishDrill({ correctCount: 6, totalCount: 6 })).xpGained).toBe(10);
	});

	it("carries the month badge through finishDrill and recordAttempt outcomes", async () =>
	{
		const februaryDays = Array.from({ length: 27 }, (_, index) => `2027-02-${String(index + 1).padStart(2, "0")}`);
		const earlierDays = (progress: { daily: { completedDates: string[] } }): void =>
		{
			progress.daily.completedDates = februaryDays;
		};
		const drillDay = createTestProgressService(localMoment(2027, 2, 28), [0], earlierDays);
		await drillDay.service.getDailyQuest({ conceptQuestIds: ["c1"], shortBuildQuestIds: [] });
		await drillDay.service.chooseDailyOffer(0);
		expect((await drillDay.service.finishDrill({ correctCount: 6, totalCount: 6 })).monthBadge).toBe("2027-02");

		const concept = makeQuest({ id: "c1", kind: "concept" });
		const conceptDay = createTestProgressService(localMoment(2027, 2, 28), [0], earlierDays);
		await conceptDay.service.getDailyQuest({ conceptQuestIds: ["c1"], shortBuildQuestIds: [] });
		await conceptDay.service.chooseDailyOffer(1);
		expect((await conceptDay.service.recordAttempt({ quest: concept, score: 100, passed: true, compiled: true, isSubmit: false }, [concept])).monthBadge).toBe("2027-02");
	});
});

describe("ProgressService refused save", () =>
{
	it("opens refused on a save from a newer version: progress calls answer save-failed, rules still answer, and the file is untouched", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		const futureSave = JSON.stringify({ version: 99 });
		fileSystem.files.set("/user-data/progress.json", futureSave);

		const service = await ProgressService.openOrRefuse(new ProgressStore(fileSystem, "/user-data"), new FixedClock(localMoment(2026, 10, 21)), new SequenceRandom());

		expect(service.getRefusal()?.code).toBe("save-failed");
		expect(() => service.getProgress()).toThrow(AppErrorException);
		await expect(service.setPlayerName("x")).rejects.toMatchObject({ appError: { code: "save-failed" } });
		expect(service.getRules().dailyDueCap).toBe(20);
		expect(fileSystem.files.get("/user-data/progress.json")).toBe(futureSave);
	});

	it("opens refused, without quarantining, when the disk will not read the save", async () =>
	{
		const fileSystem = new MemoryFileSystem();
		fileSystem.files.set("/user-data/progress.json", "{}");
		fileSystem.readErrorCode = "EBUSY";

		const service = await ProgressService.openOrRefuse(new ProgressStore(fileSystem, "/user-data"), new FixedClock(localMoment(2026, 10, 21)), new SequenceRandom());

		expect(service.getRefusal()?.detail).toMatch(/EBUSY/);
		expect([...fileSystem.files.keys()]).toEqual(["/user-data/progress.json"]);
	});
});

describe("ProgressService daily cap across drills", () =>
{
	it("lowers the day's cap by the items already reviewed today, so a backlog of 25 is not cleared in one day", async () =>
	{
		const { service } = createTestProgressService(localMoment(2026, 10, 21, 9), [0], (progress) =>
		{
			for (let index = 0; index < 25; index++) progress.schedule[`item-${String(index).padStart(2, "0")}`] = localMoment(2026, 10, 21, 8).toISOString();
		});

		expect(service.getDrillSummary()).toMatchObject({ dueToday: 20, overflow: 5 });

		// The first drill reviews ten due items.
		for (const itemId of service.getScheduledDueItemIds().slice(0, 10)) await service.reviewItem(itemId, 4);
		expect(service.getDrillSummary()).toMatchObject({ dueToday: 10, overflow: 5 });
		expect(service.getScheduledDueItemIds()).toHaveLength(10);

		// The second drill reviews ten more; the last five slide to tomorrow.
		for (const itemId of service.getScheduledDueItemIds()) await service.reviewItem(itemId, 4);
		expect(service.getDrillSummary()).toMatchObject({ dueToday: 0, overflow: 5 });
		expect(service.getScheduledDueItemIds()).toEqual([]);
		expect(service.getDueItemIds()).toEqual([]);
	});
});

