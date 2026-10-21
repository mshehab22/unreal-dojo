// Daily due cap and overflow, hovered-term injection, "Drill me" items, and drill composition.
import { describe, expect, it } from "vitest";

import { createNewProgress } from "../../src/main/services/progress/createNewProgress";
import { DrillScheduler, type DrillCandidate } from "../../src/main/services/progress/DrillScheduler";
import { localMoment } from "../support/progressFixtures";
import { SequenceRandom } from "../support/SequenceRandom";

const scheduler = new DrillScheduler();
const now = localMoment(2026, 10, 21, 9);

/** A save with `count` items due earlier today and one due tomorrow. */
function progressWithDue(count: number)
{
	const progress = createNewProgress(now);

	for (let index = 0; index < count; index++)
	{
		progress.schedule[`item-${String(index).padStart(2, "0")}`] = localMoment(2026, 10, 21, 8, index).toISOString();
	}

	progress.schedule["tomorrow"] = localMoment(2026, 10, 22, 8).toISOString();

	return progress;
}

describe("DrillScheduler due today", () =>
{
	it("caps due items at 20 per day and slides the overflow to the next day", () =>
	{
		const summary = scheduler.summary(progressWithDue(25), now);

		expect(summary.dueToday).toBe(20);
		expect(summary.overflow).toBe(5);
		expect(scheduler.dueToday(progressWithDue(25), now)).toHaveLength(20);
	});

	it("counts items due later today but not tomorrow", () =>
	{
		const progress = progressWithDue(0);
		progress.schedule["tonight"] = localMoment(2026, 10, 21, 23, 30).toISOString();

		expect(scheduler.dueToday(progress, now)).toEqual(["tonight"]);
	});

	it("serves the oldest due items first, so overflow is the newest", () =>
	{
		expect(scheduler.dueToday(progressWithDue(25), now)[0]).toBe("item-00");
	});

	it("tells the next due time", () =>
	{
		expect(scheduler.summary(progressWithDue(1), now).nextDueAt).toBe(localMoment(2026, 10, 21, 8, 0).toISOString());
		expect(scheduler.summary(createNewProgress(now), now).nextDueAt).toBeNull();
	});

	it("injects terms hovered 3 or more times that are not yet familiar, first", () =>
	{
		const progress = progressWithDue(25);
		progress.hoverCounts = { "term.hovered": 3, "term.twice": 2, "term.known": 5 };
		progress.memory["term.known"] = { ease: 2.5, intervalDays: 3, repetitions: 2, mastery: "familiar", lastReviewedAt: now.toISOString() };

		const due = scheduler.dueToday(progress, now);

		expect(due[0]).toBe("term.hovered");
		expect(due).not.toContain("term.twice");
		expect(due).not.toContain("term.known");
		expect(due).toHaveLength(20);
	});

	it("puts Drill me items before everything else", () =>
	{
		const progress = progressWithDue(3);
		progress.hoverCounts = { "term.hovered": 4 };
		progress.drillQueue = ["pattern.observer"];

		expect(scheduler.dueToday(progress, now).slice(0, 2)).toEqual(["pattern.observer", "term.hovered"]);
	});
});

/** A candidate. */
function candidate(itemId: string, format: DrillCandidate["format"], topic: string): DrillCandidate
{
	return { itemId, format, topic };
}

describe("DrillScheduler composition", () =>
{
	const random = new SequenceRandom([0.3, 0.7, 0.1, 0.9, 0.5]);

	it("holds at most 10 items", () =>
	{
		const priority = Array.from({ length: 15 }, (_, index) => candidate(`r${index}`, "recall", `topic-${index % 3}`));

		expect(scheduler.compose(priority, [], random)).toHaveLength(10);
	});

	it("fills up to 6 items from the pool when too few are due", () =>
	{
		const pool = Array.from({ length: 8 }, (_, index) => candidate(`p${index}`, "recall", "topic"));

		expect(scheduler.compose([candidate("due", "recall", "topic")], pool, random)).toHaveLength(6);
	});

	it("includes one pattern discrimination, one Parsons reorder, and one explain item, from the pool when none are due", () =>
	{
		const priority = Array.from({ length: 12 }, (_, index) => candidate(`r${index}`, "recall", "topic"));
		const pool = [candidate("scenario", "pattern-discrimination", "patterns"), candidate("parsons", "parsons", "ue.objects"), candidate("explain", "explain", "ue.memory")];
		const formats = scheduler.compose(priority, pool, random).map((item) => item.format);

		expect(formats).toContain("pattern-discrimination");
		expect(formats).toContain("parsons");
		expect(formats).toContain("explain");
		expect(formats).toHaveLength(10);
	});

	it("mixes topics instead of draining one topic first", () =>
	{
		const priority = [
			...Array.from({ length: 8 }, (_, index) => candidate(`a${index}`, "recall", "topic-a")),
			...Array.from({ length: 8 }, (_, index) => candidate(`b${index}`, "recall", "topic-b")),
		];
		const topics = scheduler.compose(priority, [], random).map((item) => item.topic);

		expect(topics.filter((topic) => topic === "topic-a")).toHaveLength(5);
		expect(topics.filter((topic) => topic === "topic-b")).toHaveLength(5);
	});

	it("never repeats an item", () =>
	{
		const shared = candidate("parsons", "parsons", "topic");
		const items = scheduler.compose([shared, candidate("r1", "recall", "topic")], [shared], random);

		expect(new Set(items.map((item) => item.itemId)).size).toBe(items.length);
	});
});
