// The level curve and one test per role row.
import { describe, expect, it } from "vitest";

import { LevelRules } from "../../src/main/services/progress/LevelRules";

const rules = new LevelRules();

describe("LevelRules", () =>
{
	it("needs round(200 * 1.35^(level - 1)) XP for the next level", () =>
	{
		expect(rules.xpToNext(1)).toBe(200);
		expect(rules.xpToNext(2)).toBe(270);
		expect(rules.xpToNext(3)).toBe(365);
		expect(rules.xpToNext(10)).toBe(Math.round(200 * Math.pow(1.35, 9)));
	});

	it("turns total XP into a level", () =>
	{
		expect(rules.levelForXp(0)).toBe(1);
		expect(rules.levelForXp(199)).toBe(1);
		expect(rules.levelForXp(200)).toBe(2);
		expect(rules.levelForXp(469)).toBe(2);
		expect(rules.levelForXp(470)).toBe(3);
	});

	const roles: [number, string][] = [
		[1, "Apprentice"],
		[4, "Scripter"],
		[8, "Builder"],
		[12, "Systems Smith"],
		[16, "Pattern Seeker"],
		[20, "Architect"],
		[25, "Engine Whisperer"],
		[30, "Lead"],
		[40, "Principal"],
		[50, "Legend"],
	];

	for (const [level, role] of roles)
	{
		it(`gives the ${role} role from level ${level}`, () =>
		{
			expect(rules.roleForLevel(level)).toBe(role);
			if (level > 1) expect(rules.roleForLevel(level - 1)).not.toBe(role);
		});
	}
});
