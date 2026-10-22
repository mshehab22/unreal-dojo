// M2.2b: repeated review dates collapse into counts, and the loot screen's Next only goes to a quest that is open.
import { describe, expect, it } from "vitest";

import type { QuestOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

import { describeDueGroups } from "../../src/renderer/src/lib/dueGroups";
import { nextOpenQuest } from "../../src/renderer/src/lib/nextOpenQuest";

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
	it("collapses repeated days into a count, in time order", () =>
	{
		expect(describeDueGroups([daysLater(1), daysLater(5), daysLater(1), daysLater(1)], NOW)).toBe("3 reviews tomorrow, 1 review in 5 days");
	});

	it("says one review plainly", () =>
	{
		expect(describeDueGroups([daysLater(3)], NOW)).toBe("1 review in 3 days");
	});
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
