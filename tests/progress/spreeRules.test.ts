// Spree: first-try Submit passes on build and refactor, armor, best never lost, bonus threshold.
import { describe, expect, it } from "vitest";

import { SpreeRules } from "../../src/main/services/progress/SpreeRules";

const rules = new SpreeRules();
const start = { current: 4, best: 6, armor: 0 };

describe("SpreeRules", () =>
{
	it("adds one on a first-try Submit pass", () =>
	{
		expect(rules.applySubmit(start, { countsForSpree: true, firstSubmit: true, passed: true }).spree).toEqual({ current: 5, best: 6, armor: 0 });
	});

	it("resets on a first-try miss but never loses the best spree", () =>
	{
		expect(rules.applySubmit(start, { countsForSpree: true, firstSubmit: true, passed: false }).spree).toEqual({ current: 0, best: 6, armor: 0 });
	});

	it("raises best when current passes it", () =>
	{
		expect(rules.applySubmit({ current: 6, best: 6, armor: 0 }, { countsForSpree: true, firstSubmit: true, passed: true }).spree.best).toBe(7);
	});

	it("lets armor absorb one miss", () =>
	{
		const result = rules.applySubmit({ ...start, armor: 1 }, { countsForSpree: true, firstSubmit: true, passed: false });

		expect(result.spree).toEqual({ current: 4, best: 6, armor: 0 });
		expect(result.armorUsed).toBe(true);
	});

	it("ignores quests that do not count (not build or refactor, a repeat, or Run)", () =>
	{
		expect(rules.applySubmit(start, { countsForSpree: false, firstSubmit: true, passed: false }).spree).toEqual(start);
	});

	it("ignores later submits of the same quest (only the first try counts)", () =>
	{
		expect(rules.applySubmit(start, { countsForSpree: true, firstSubmit: false, passed: true }).spree).toEqual(start);
		expect(rules.applySubmit(start, { countsForSpree: true, firstSubmit: false, passed: false }).spree).toEqual(start);
	});

	it("starts the bonus at a spree of 5", () =>
	{
		expect(rules.bonusApplies(4)).toBe(false);
		expect(rules.bonusApplies(5)).toBe(true);
	});

	it("caps armor at two", () =>
	{
		expect(rules.earnArmor({ current: 0, best: 0, armor: 2 }).armor).toBe(2);
		expect(rules.earnArmor({ current: 0, best: 0, armor: 0 }).armor).toBe(1);
	});
});
