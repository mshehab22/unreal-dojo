// Streak: activity within every 3 days, freezes across day boundaries, milestones, no repairs.
import { describe, expect, it } from "vitest";

import { StreakRules } from "../../src/main/services/progress/StreakRules";
import { localMoment } from "../support/progressFixtures";

const rules = new StreakRules();

/** A streak whose last activity was on 1 October at 22:00 local. */
function streakFrom(count: number, freezes = 0, milestones: number[] = [])
{
	return { count, lastActivityAt: localMoment(2026, 10, 1, 22).toISOString(), freezes, milestones };
}

describe("StreakRules", () =>
{
	it("starts at 1 on the first activity", () =>
	{
		const update = rules.recordActivity({ count: 0, lastActivityAt: null, freezes: 0, milestones: [] }, localMoment(2026, 10, 1));

		expect(update.streak.count).toBe(1);
	});

	it("does not count a second activity on the same calendar day", () =>
	{
		expect(rules.recordActivity(streakFrom(3), localMoment(2026, 10, 1, 23, 30)).streak.count).toBe(3);
	});

	it("counts an activity just after midnight as the next day", () =>
	{
		expect(rules.recordActivity(streakFrom(3), localMoment(2026, 10, 2, 0, 5)).streak.count).toBe(4);
	});

	it("keeps the streak when the gap is 3 calendar days", () =>
	{
		const update = rules.recordActivity(streakFrom(3), localMoment(2026, 10, 4, 8));

		expect(update.streak.count).toBe(4);
		expect(update.freezesUsed).toBe(0);
	});

	it("spends one freeze automatically on a 4 to 6 day gap", () =>
	{
		const update = rules.recordActivity(streakFrom(3, 2), localMoment(2026, 10, 7));

		expect(update.streak.count).toBe(4);
		expect(update.streak.freezes).toBe(1);
		expect(update.freezesUsed).toBe(1);
	});

	it("spends two freezes on a 7 to 9 day gap", () =>
	{
		const update = rules.recordActivity(streakFrom(3, 2), localMoment(2026, 10, 10));

		expect(update.streak.count).toBe(4);
		expect(update.streak.freezes).toBe(0);
	});

	it("restarts at 1 without enough freezes, and keeps the freezes it could not use (no repairs)", () =>
	{
		const update = rules.recordActivity(streakFrom(9, 1), localMoment(2026, 10, 10));

		expect(update.streak.count).toBe(1);
		expect(update.streak.freezes).toBe(1);
		expect(update.freezesUsed).toBe(0);
	});

	it("shows 0 once the held freezes can no longer bridge the gap", () =>
	{
		expect(rules.countAt(streakFrom(5, 1), localMoment(2026, 10, 7))).toBe(5);
		expect(rules.countAt(streakFrom(5, 1), localMoment(2026, 10, 8))).toBe(0);
	});

	it("holds at most two freezes, earned one per boss", () =>
	{
		expect(rules.earnFreeze(streakFrom(1, 1)).freezes).toBe(2);
		expect(rules.earnFreeze(streakFrom(1, 2)).freezes).toBe(2);
	});

	for (const milestone of [7, 30, 100])
	{
		it(`celebrates the ${milestone} milestone`, () =>
		{
			const update = rules.recordActivity(streakFrom(milestone - 1), localMoment(2026, 10, 2));

			expect(update.milestoneReached).toBe(milestone);
			expect(update.streak.milestones).toContain(milestone);
		});
	}

	it("does not celebrate a non-milestone count", () =>
	{
		expect(rules.recordActivity(streakFrom(7), localMoment(2026, 10, 2)).milestoneReached).toBeUndefined();
	});
});
