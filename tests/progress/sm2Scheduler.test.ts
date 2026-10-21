// SM-2: quality from score rows, intervals 1, 3, then interval times ease, ease bounds, misses, and the review log entry.
import { describe, expect, it } from "vitest";

import { Sm2Scheduler } from "../../src/main/services/progress/Sm2Scheduler";
import { localMoment } from "../support/progressFixtures";

const scheduler = new Sm2Scheduler();
const at = localMoment(2026, 10, 21, 9);

describe("Sm2Scheduler quality from score", () =>
{
	const rows: [number, boolean, number][] = [
		[95, true, 5],
		[100, true, 5],
		[85, true, 4],
		[94, true, 4],
		[70, true, 3],
		[84, true, 3],
		[60, false, 2],
		[50, false, 2],
		[49, false, 1],
	];

	for (const [score, passed, quality] of rows)
	{
		it(`maps score ${score} (${passed ? "pass" : "miss"}) to quality ${quality}`, () =>
		{
			expect(scheduler.qualityFromScore(score, passed)).toBe(quality);
		});
	}

	it("maps a plain right drill answer to 4 and a wrong one to 1", () =>
	{
		expect(scheduler.qualityFromAnswer(true)).toBe(4);
		expect(scheduler.qualityFromAnswer(false)).toBe(1);
	});
});

describe("Sm2Scheduler intervals", () =>
{
	it("starts ease at 2.5 and schedules 1 day, then 3 days, then interval times ease", () =>
	{
		const first = scheduler.review("term.uobject", undefined, 4, at);
		expect(first.memory.ease).toBe(2.5);
		expect(first.memory.intervalDays).toBe(1);
		expect(first.dueAt).toBe(new Date(at.getTime() + 1 * 86_400_000).toISOString());

		const second = scheduler.review("term.uobject", first.memory, 4, new Date(first.dueAt));
		expect(second.memory.intervalDays).toBe(3);

		const third = scheduler.review("term.uobject", second.memory, 4, new Date(second.dueAt));
		expect(third.memory.intervalDays).toBe(Math.round(3 * 2.5));
	});

	it("raises ease on quality 5 and lowers it on quality 3", () =>
	{
		expect(scheduler.nextEase(2.5, 5)).toBe(2.6);
		expect(scheduler.nextEase(2.5, 3)).toBe(2.36);
	});

	it("never lets ease fall below 1.3", () =>
	{
		expect(scheduler.nextEase(1.35, 1)).toBe(1.3);
	});

	it("restarts at 1 day on a miss and resets the recall run", () =>
	{
		const learned = scheduler.review("term.uobject", { ease: 2.5, intervalDays: 20, repetitions: 4, mastery: "proficient", lastReviewedAt: at.toISOString() }, 1, at);

		expect(learned.memory.intervalDays).toBe(1);
		expect(learned.memory.repetitions).toBe(0);
		expect(learned.memory.mastery).toBe("familiar");
		expect(learned.successful).toBe(false);
	});

	it("logs a success before the due day but does not advance repetitions, interval, ease, or mastery", () =>
	{
		const first = scheduler.review("term.uobject", undefined, 5, at);
		const early = scheduler.review("term.uobject", first.memory, 5, at);
		const sameInstantAgain = scheduler.review("term.uobject", early.memory, 5, at);

		expect(sameInstantAgain.memory).toEqual(first.memory);
		expect(sameInstantAgain.counted).toBe(false);
		expect(sameInstantAgain.dueAt).toBe(first.dueAt);
		expect(sameInstantAgain.logEntry.quality).toBe(5);
		expect(sameInstantAgain.memory.mastery).toBe("familiar");
	});

	it("counts a success later on the due day", () =>
	{
		const first = scheduler.review("term.uobject", undefined, 4, localMoment(2026, 10, 21, 20));
		const nextMorning = scheduler.review("term.uobject", first.memory, 4, localMoment(2026, 10, 22, 7));

		expect(nextMorning.counted).toBe(true);
		expect(nextMorning.memory.repetitions).toBe(2);
	});

	it("still counts a miss before the due day (a miss is real evidence)", () =>
	{
		const first = scheduler.review("term.uobject", undefined, 4, at);
		const miss = scheduler.review("term.uobject", first.memory, 1, at);

		expect(miss.counted).toBe(true);
		expect(miss.memory.repetitions).toBe(0);
	});

	it("returns a review log entry for every review (so FSRS can replay the history later)", () =>
	{
		const review = scheduler.review("term.uobject", undefined, 5, at);

		expect(review.logEntry).toEqual({ itemId: "term.uobject", at: at.toISOString(), quality: 5, intervalDays: 1, ease: 2.6 });
	});
});
