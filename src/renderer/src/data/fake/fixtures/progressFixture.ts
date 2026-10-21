// Save files for the fake: a learner part way through Pack 1, and a brand new learner.
import type { AttemptRecord, DailyQuestState, PlayerProgress, QuestProgress } from "@shared/types/progress";

import { daysFromNow, todayLocal } from "./fakeClock";
import { MAP_FIXTURE, type StageFixture } from "./mapFixture";

/** Every stage of the map, in map order. */
function allStages(): StageFixture[]
{
	return MAP_FIXTURE.flatMap((pack) => pack.worlds.flatMap((world) => world.stages));
}

/** A quest's save entry for a stage's status. */
function questProgressFor(stage: StageFixture, index: number): QuestProgress
{
	const touched = stage.status === "passed" || stage.status === "in_progress";

	return {
		status: stage.status,
		bestScore: stage.bestScore ?? null,
		attempts: stage.status === "passed" ? 1 + (index % 3 === 0 ? 1 : 0) : 0,
		hintsRevealed: index % 4 === 1 ? 1 : 0,
		solutionViewed: false,
		savedFiles: {},
		lastAttemptAt: touched ? daysFromNow(-30 + index) : null,
	};
}

/** One passing attempt per passed stage, plus one failed first try on the flicker quest. */
function attemptsFor(stages: StageFixture[]): AttemptRecord[]
{
	const attempts: AttemptRecord[] = [];

	stages.forEach((stage, index) =>
	{
		if (stage.status !== "passed") return;

		if (stage.id === "foundations.objects.flicker")
		{
			attempts.push({ attemptId: `attempt-${index}-a`, questId: stage.id, at: daysFromNow(-24 + index, -2), score: 55, passed: false, xpGained: 4 });
		}

		attempts.push({ attemptId: `attempt-${index}`, questId: stage.id, at: daysFromNow(-24 + index), score: stage.bestScore ?? 80, passed: true, xpGained: stage.xp });
	});

	return attempts;
}

/** Today's three offers, not chosen yet. */
function dailyFixture(): DailyQuestState
{
	return {
		date: todayLocal(),
		offered: [{ kind: "drill" }, { kind: "concept", questId: "mechanics.input.actions" }, { kind: "build", questId: "foundations.memory.soft-mesh" }],
		done: false,
		monthBadges: ["2026-09"],
	};
}

/** A learner about a month in: world 1 shipped, world 2 under way. */
export function returningProgressFixture(): PlayerProgress
{
	const stages = allStages();
	const quests: Record<string, QuestProgress> = {};

	stages.forEach((stage, index) =>
	{
		if (stage.status !== "locked") quests[stage.id] = questProgressFor(stage, index);
	});

	return {
		version: 1,
		playerName: "Mohammad",
		studio: { name: "Night Owl Studio", modules: ["night-market-lighting"] },
		xp: 1240,
		role: "Scripter",
		streak: { count: 9, lastActivityAt: daysFromNow(-1), freezes: 1, milestones: [7] },
		spree: { current: 3, best: 5, armor: 1 },
		seerStones: 1,
		patternCards: {
			component: { tier: "silver", useCasesPassed: ["foundations.objects.proximity", "foundations.objects.boss", "foundations.objects.switch"] },
			"update-method": { tier: "bronze", useCasesPassed: ["foundations.objects.flicker"] },
			observer: { tier: "bronze", useCasesPassed: ["foundations.objects.boss"] },
		},
		skills: {
			"ue.objects.uproperty": { points: 9, mastery: "mastered" },
			"ue.objects.uclass": { points: 4, mastery: "proficient" },
			"ue.objects.actors": { points: 11, mastery: "proficient" },
			"ue.objects.ufunction": { points: 4, mastery: "familiar" },
			"ue.memory.gc": { points: 4, mastery: "proficient" },
			"ue.memory.weak": { points: 6, mastery: "familiar" },
			"ue.memory.soft-refs": { points: 1, mastery: "attempted" },
			"ue.collision.overlaps": { points: 3, mastery: "familiar" },
			"patterns.lens": { points: 2, mastery: "familiar" },
			"breakdown.decompose": { points: 5, mastery: "proficient" },
			"breakdown.integrate": { points: 6, mastery: "familiar" },
		},
		quests,
		attempts: attemptsFor(stages),
		reviewLog: [],
		schedule: {
			uproperty: daysFromNow(12),
			uclass: daysFromNow(0, 3),
			"timer-manager": daysFromNow(0, 5),
			tobjectptr: daysFromNow(1),
			tweakobjectptr: daysFromNow(2),
			"garbage-collection": daysFromNow(4),
		},
		hoverCounts: { tsoftobjectptr: 2, "garbage-collection": 4 },
		daily: dailyFixture(),
		createdAt: daysFromNow(-32),
		updatedAt: daysFromNow(-1),
	};
}

/** A save with nothing in it yet, as `resetProgress` returns. */
export function freshProgressFixture(): PlayerProgress
{
	return {
		version: 1,
		playerName: "",
		studio: { name: "Your studio", modules: [] },
		xp: 0,
		role: "Apprentice",
		streak: { count: 0, lastActivityAt: null, freezes: 0, milestones: [] },
		spree: { current: 0, best: 0, armor: 0 },
		seerStones: 0,
		patternCards: {},
		skills: {},
		quests: {},
		attempts: [],
		reviewLog: [],
		schedule: {},
		hoverCounts: {},
		daily: { date: todayLocal(), offered: [{ kind: "drill" }, { kind: "concept", questId: "foundations.objects.uproperty" }, { kind: "concept", questId: "patterns.lens.decoupling" }], done: false, monthBadges: [] },
		createdAt: daysFromNow(0),
		updatedAt: daysFromNow(0),
	};
}
