// Pattern card unlocks and the bronze, silver, gold tier rows.
import { describe, expect, it } from "vitest";

import { PatternCardRules } from "../../src/main/services/progress/PatternCardRules";

const rules = new PatternCardRules();

describe("PatternCardRules", () =>
{
	const rows: [number, string | null][] = [
		[0, null],
		[1, "bronze"],
		[2, "bronze"],
		[3, "silver"],
		[4, "silver"],
		[5, "gold"],
	];

	for (const [count, tier] of rows)
	{
		it(`gives tier ${tier} at ${count} distinct use cases`, () =>
		{
			expect(rules.tierFor(count)).toBe(tier);
		});
	}

	it("unlocks a card at bronze on the first pass of a quest listing the pattern", () =>
	{
		const { cards, changes } = rules.applyPass({}, "q1", ["observer"]);

		expect(cards.observer).toEqual({ tier: "bronze", useCasesPassed: ["q1"] });
		expect(changes).toEqual([{ patternId: "observer", tierBefore: null, tierAfter: "bronze" }]);
	});

	it("counts a quest once, so passing it again does not upgrade", () =>
	{
		const first = rules.applyPass({}, "q1", ["observer"]);
		const second = rules.applyPass(first.cards, "q1", ["observer"]);

		expect(second.cards.observer?.useCasesPassed).toEqual(["q1"]);
		expect(second.changes).toEqual([]);
	});

	it("upgrades to silver on the third distinct use case", () =>
	{
		let cards = rules.applyPass({}, "q1", ["observer"]).cards;
		cards = rules.applyPass(cards, "q2", ["observer"]).cards;
		const third = rules.applyPass(cards, "q3", ["observer"]);

		expect(third.changes).toEqual([{ patternId: "observer", tierBefore: "bronze", tierAfter: "silver" }]);
	});
});
