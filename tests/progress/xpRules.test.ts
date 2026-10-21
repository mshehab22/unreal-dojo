// One test per row of the XP table plus every XP rule: band math, repeats, rematches, drills, hints, solutions, effort, spree, potion, floors.
import { describe, expect, it } from "vitest";

import { XpRules, type QuestXpInput } from "../../src/main/services/progress/XpRules";

const rules = new XpRules();

/** A first-try pass at level 0 band (band 1) of a difficulty 1 quest worth 100 XP. */
function input(fields: Partial<QuestXpInput> = {}): QuestXpInput
{
	return {
		baseXp: 100,
		difficulty: 1,
		level: 1,
		result: "passed",
		previouslyPassed: false,
		isRematch: false,
		hintsRevealed: 0,
		solutionViewedWithoutStone: false,
		effortAlreadyGranted: false,
		spreeAfter: 0,
		potionActive: false,
		...fields,
	};
}

describe("XpRules band math", () =>
{
	it("computes the learner band as floor(level / 4) + 1 clamped to 1..5", () =>
	{
		expect(rules.learnerBand(1)).toBe(1);
		expect(rules.learnerBand(3)).toBe(1);
		expect(rules.learnerBand(4)).toBe(2);
		expect(rules.learnerBand(12)).toBe(4);
		expect(rules.learnerBand(16)).toBe(5);
		expect(rules.learnerBand(50)).toBe(5);
	});

	const rows: [string, number, number, number][] = [
		["far above", 3, 1, 1.3],
		["above", 2, 1, 1.12],
		["at level", 2, 4, 1.0],
		["below", 1, 4, 0.6],
		["far below", 1, 8, 0.25],
	];

	for (const [band, difficulty, level, multiplier] of rows)
	{
		it(`multiplies base XP by ${multiplier} when the quest is ${band}`, () =>
		{
			expect(rules.multiplier(difficulty, level)).toBe(multiplier);
			expect(rules.questXp(input({ difficulty, level })).firstPass).toBe(Math.round(100 * multiplier));
		});
	}

	it("treats a gap of more than two bands as far above or far below", () =>
	{
		expect(rules.band(5, 1)).toBe("far-above");
		expect(rules.band(1, 20)).toBe("far-below");
	});
});

describe("XpRules pricing", () =>
{
	it("pays first-pass XP once; a repeat pays 0", () =>
	{
		expect(rules.questXp(input()).total).toBe(100);
		expect(rules.questXp(input({ previouslyPassed: true })).total).toBe(0);
	});

	it("pays 50% on a rematch", () =>
	{
		expect(rules.questXp(input({ previouslyPassed: true, isRematch: true })).total).toBe(50);
	});

	it("pays a flat 10 per completed drill", () =>
	{
		expect(rules.drillXp(false)).toBe(10);
	});

	it("charges 15% of base XP per hint spell", () =>
	{
		const breakdown = rules.questXp(input({ hintsRevealed: 2 }));

		expect(breakdown.hintCost).toBe(-30);
		expect(breakdown.total).toBe(70);
	});

	it("never lets hints push a pass below 0 XP (floor)", () =>
	{
		const breakdown = rules.questXp(input({ difficulty: 1, level: 8, hintsRevealed: 3 }));

		expect(breakdown.firstPass).toBe(25);
		expect(breakdown.hintCost).toBe(-25);
		expect(breakdown.total).toBe(0);
	});

	it("pays 0 when the solution was viewed without a Seer Stone", () =>
	{
		expect(rules.questXp(input({ solutionViewedWithoutStone: true })).total).toBe(0);
	});

	it("pays 5% effort XP for a failed but compiled attempt, once per quest", () =>
	{
		expect(rules.questXp(input({ result: "failed-compiled" })).effort).toBe(5);
		expect(rules.questXp(input({ result: "failed-compiled", effortAlreadyGranted: true })).total).toBe(0);
		expect(rules.questXp(input({ result: "failed" })).total).toBe(0);
	});

	it("adds +5% on the passing submit while the spree is 5 or more", () =>
	{
		expect(rules.questXp(input({ spreeAfter: 5 })).spreeBonus).toBe(5);
		expect(rules.questXp(input({ spreeAfter: 4 })).spreeBonus).toBe(0);
	});

	it("adds +50% while an XP potion is active, on quests and drills", () =>
	{
		expect(rules.questXp(input({ potionActive: true })).total).toBe(150);
		expect(rules.drillXp(true)).toBe(15);
	});
});
