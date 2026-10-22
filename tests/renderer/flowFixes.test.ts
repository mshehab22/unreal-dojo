// M2.2b: review dates named once each, the last Submit restored from the save, and the loot screen's Next only going to a quest that is open.
import { describe, expect, it } from "vitest";

import type { QuestOutline } from "@shared/types/catalog";
import type { PlayerProgress, QuestAvailability } from "@shared/types/progress";

import { FakeDojoApi } from "../../src/renderer/src/data/fake/FakeDojoApi";
import { describeDueGroups } from "../../src/renderer/src/lib/dueGroups";
import { nextOpenQuest } from "../../src/renderer/src/lib/nextOpenQuest";
import { lastSubmitResult } from "../../src/renderer/src/screens/quests/build/lastSubmitResult";

/** A fixed "now" so the words do not depend on the clock. */
const NOW = new Date("2026-10-21T12:00:00");

/** An ISO time some days after NOW. */
function daysLater(days: number): string
{
	return new Date(NOW.getTime() + days * 86_400_000).toISOString();
}

/** A bare outline with an id and an order. */
function outline(id: string, order: number): QuestOutline
{
	return { id, order, title: id, kind: "build", difficulty: 1, patterns: [], skills: [], terms: [], prerequisites: [], xp: 10, estimatedMinutes: 5, concepts: [] };
}

/** Availability with a status. */
function standing(status: QuestAvailability["status"]): QuestAvailability
{
	return { status, dueForRematch: false, skippable: false };
}

describe("describeDueGroups", () =>
{
	it("names each day once, in time order, without claiming a count (the list holds only the soonest few)", () =>
	{
		expect(describeDueGroups([daysLater(1), daysLater(5), daysLater(1), daysLater(1)], NOW)).toBe("tomorrow and in 5 days");
	});

	it("says a past or current time is due now", () =>
	{
		expect(describeDueGroups([daysLater(-2), daysLater(0), daysLater(3)], NOW)).toBe("due now and in 3 days");
		expect(describeDueGroups([daysLater(1)], NOW)).toBe("tomorrow");
	});
});

describe("lastSubmitResult (A814)", () =>
{
	const run = { ok: false, compiled: false, compilerOutput: "error C2059", tests: [], testsPassed: 0, testsTotal: 0, durationMs: 1, loop: "headless" as const };

	it("falls back to the quest's latest stored attempt when the loot hand-off is gone (a reload)", async () =>
	{
		const progress = { attempts: [
			{ attemptId: "a", questId: "q", at: "", score: 0, passed: false, xpGained: 0, run: { ...run, compilerOutput: "older" } },
			{ attemptId: "b", questId: "other", at: "", score: 0, passed: false, xpGained: 0, run },
			{ attemptId: "c", questId: "q", at: "", score: 0, passed: false, xpGained: 0, run },
		] } as unknown as PlayerProgress;

		expect(lastSubmitResult("q", null, progress)?.compilerOutput).toBe("error C2059");
		expect(lastSubmitResult("none", null, progress)).toBeNull();
	});

	it("keeps the run on the fake's build attempts, as the progress service does (A740)", async () =>
	{
		const fake = new FakeDojoApi("quests");
		await fake.submitQuest({ runId: "r", questId: "f1-score-keeper", files: { "DojoF1ScoreKeeper.h": "{" } });
		const progress = await fake.getProgress();
		const result = lastSubmitResult("f1-score-keeper", null, progress);

		expect(result?.compiled).toBe(false);
		expect(result?.compilerOutput).toContain("error");
	}, 20_000);
});

describe("nextOpenQuest", () =>
{
	const quests = [outline("a", 1), outline("b", 2), outline("c", 3), outline("d", 4)];

	it("skips locked and passed quests to the next open one", () =>
	{
		expect(nextOpenQuest(quests, 1, { b: standing("locked"), c: standing("passed"), d: standing("available") })?.id).toBe("d");
		expect(nextOpenQuest(quests, 1, { b: standing("in_progress") })?.id).toBe("b");
	});

	it("answers null when nothing later is open, so Next goes back to the map", () =>
	{
		expect(nextOpenQuest(quests, 2, { c: standing("locked"), d: standing("passed") })).toBeNull();
	});
});
