// The unlock graph: first quests, prerequisites, terms at familiar, test-out, the Pack 4 gate, newly unlocked quests, and rematch world selection.
import { describe, expect, it } from "vitest";

import type { MasteryLevel, QuestProgress } from "@shared/types/progress";

import { createNewQuestProgress } from "../../src/main/services/progress/createNewProgress";
import { RematchSelector } from "../../src/main/services/progress/RematchSelector";
import { TestOutRules } from "../../src/main/services/progress/TestOutRules";
import { UnlockGraph, type UnlockState } from "../../src/main/services/progress/UnlockGraph";
import { makeQuest } from "../support/progressFixtures";

/** A passed quest's progress. */
function passed(): QuestProgress
{
	return { ...createNewQuestProgress(), status: "passed" };
}

/** An unlock state from passed quest ids and term mastery. */
function state(passedIds: string[] = [], mastery: Record<string, MasteryLevel> = {}, testedOutWorldIds: string[] = []): UnlockState
{
	return {
		now: new Date("2026-10-21T12:00:00.000Z"),
		quests: Object.fromEntries(passedIds.map((questId) => [questId, passed()])),
		masteryOf: (itemId) => mastery[itemId],
		testedOutWorldIds,
		rematches: {},
	};
}

const first = makeQuest({ id: "first", title: "Hello Actor", order: 1, terms: ["term.actor"] });
const second = makeQuest({ id: "second", title: "Health Component", order: 2, prerequisites: ["first"], terms: ["term.component"], scaffold: "worked" });
const third = makeQuest({ id: "third", title: "Damage", order: 3, prerequisites: ["second"], scaffold: "stub" });
const boss = makeQuest({ id: "boss", title: "Arena Boss", kind: "boss", order: 4, prerequisites: ["second"] });

describe("UnlockGraph", () =>
{
	it("always opens the first quest of each pack's first world, even with weak terms", () =>
	{
		expect(new UnlockGraph([first, second]).availability(state())["first"]?.status).toBe("available");
	});

	it("locks a quest until its prerequisites are passed, naming them", () =>
	{
		const availability = new UnlockGraph([first, second]).availability(state([], { "term.component": "familiar" }));

		expect(availability["second"]).toMatchObject({ status: "locked", lockedReason: "Pass Hello Actor first." });
	});

	it("locks a quest until every term is at least familiar", () =>
	{
		const graph = new UnlockGraph([first, second]);

		expect(graph.availability(state(["first"], { "term.component": "attempted" }))["second"]?.status).toBe("locked");
		expect(graph.availability(state(["first"], { "term.component": "familiar" }))["second"]?.status).toBe("available");
	});

	it("waives the term rule in a tested-out world and lets worked and faded build quests be skipped", () =>
	{
		const availability = new UnlockGraph([first, second, third]).availability(state(["first"], {}, ["world-1"]));

		expect(availability["second"]).toMatchObject({ status: "available", skippable: true });
		expect(availability["third"]).toMatchObject({ status: "available", skippable: false });
	});

	it("never lets a boss be skipped by test-out", () =>
	{
		expect(new TestOutRules().isSkippable(boss)).toBe(false);
		expect(new UnlockGraph([first, second, boss]).availability(state(["first"], {}, ["world-1"]))["boss"]?.skippable).toBe(false);
	});

	it("tests out a world when every term in it is at proficient", () =>
	{
		const rules = new TestOutRules();

		expect(rules.testedOutWorlds([first, second], (term) => ({ "term.actor": "proficient", "term.component": "mastered" })[term] as MasteryLevel)).toEqual(["world-1"]);
		expect(rules.testedOutWorlds([first, second], (term) => ({ "term.actor": "proficient", "term.component": "familiar" })[term] as MasteryLevel)).toEqual([]);
	});

	it("opens Pack 4 only after the Pack 1 world 5 and Pack 2 world 4 bosses", () =>
	{
		const packOneBoss = makeQuest({ id: "p1w5-boss", title: "Foundations Boss", kind: "boss", packId: "foundations", packOrder: 1, worldId: "p1w5", worldOrder: 5 });
		const packTwoBoss = makeQuest({ id: "p2w4-boss", title: "Patterns Boss", kind: "boss", packId: "patterns", packOrder: 2, worldId: "p2w4", worldOrder: 4 });
		const packFourFirst = makeQuest({ id: "p4-first", title: "Inventory", packId: "systems", packOrder: 4, worldId: "p4w1", worldOrder: 1 });
		const graph = new UnlockGraph([packOneBoss, packTwoBoss, packFourFirst]);

		expect(graph.availability(state(["p1w5-boss"]))["p4-first"]).toMatchObject({ status: "locked", lockedReason: "Beat Patterns Boss first." });
		expect(graph.availability(state(["p1w5-boss", "p2w4-boss"]))["p4-first"]?.status).toBe("available");
	});

	it("reports quests that a pass newly unlocked", () =>
	{
		const graph = new UnlockGraph([first, second, third]);

		expect(graph.newlyUnlocked(state([], { "term.component": "familiar" }), state(["first"], { "term.component": "familiar" }))).toEqual(["second"]);
	});

	it("flags a rematch only once its due time has come", () =>
	{
		const graph = new UnlockGraph([first]);
		const progressState = state(["first"]);

		progressState.rematches = { first: "2026-10-22T12:00:00.000Z" };
		expect(graph.availability(progressState)["first"]?.dueForRematch).toBe(false);

		progressState.now = new Date("2026-10-22T12:00:00.000Z");
		expect(graph.availability(progressState)["first"]?.dueForRematch).toBe(true);
	});

	it("keeps an in-progress status once the quest is open, and passed always wins", () =>
	{
		const progressState = state(["first"], { "term.component": "familiar" });
		progressState.quests["second"] = { ...createNewQuestProgress(), status: "in_progress" };

		expect(new UnlockGraph([first, second]).availability(progressState)["second"]?.status).toBe("in_progress");
		expect(new UnlockGraph([first, second]).availability(state(["second"]))["second"]?.status).toBe("passed");
	});
});

describe("RematchSelector", () =>
{
	const selector = new RematchSelector();
	const worldOne = makeQuest({ id: "w1", patterns: ["observer"], worldId: "world-1", worldOrder: 1 });
	const worldTwo = makeQuest({ id: "w2", patterns: ["observer"], worldId: "world-2", worldOrder: 2 });
	const passedBoth = { w1: { status: "passed" as const, dueForRematch: false, skippable: false }, w2: { status: "passed" as const, dueForRematch: false, skippable: false } };

	it("surfaces a due item as a quest from a different world than the one it was earned in", () =>
	{
		expect(selector.select("observer", "world-1", [worldOne, worldTwo], passedBoth)).toBe("w2");
	});

	it("falls back to the same world when no other world uses the item", () =>
	{
		expect(selector.select("observer", "world-1", [worldOne], passedBoth)).toBe("w1");
	});

	it("only replays passed quests", () =>
	{
		expect(selector.select("observer", "world-1", [worldOne, worldTwo], { ...passedBoth, w2: { status: "available", dueForRematch: false, skippable: false } })).toBe("w1");
		expect(selector.select("unknown", "world-1", [worldOne, worldTwo], passedBoth)).toBeNull();
	});
});
