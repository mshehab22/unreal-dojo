// Turns total XP into a level and a level into a role.
import { LEVEL_CURVE, ROLES } from "./rules";

/** Level curve and role ladder. Pure: no I/O. */
export class LevelRules
{
	/** XP needed to go from `level` to the next: round(200 * 1.35^(level - 1)). */
	xpToNext(level: number): number
	{
		return Math.round(LEVEL_CURVE.base * Math.pow(LEVEL_CURVE.growth, level - 1));
	}

	/** The level reached with this much total XP (level 1 at 0 XP). */
	levelForXp(totalXp: number): number
	{
		let level = 1;
		let remaining = totalXp;

		while (remaining >= this.xpToNext(level))
		{
			remaining -= this.xpToNext(level);
			level++;
		}

		return level;
	}

	/** The role held at a level: the highest role whose start level is at or below it. */
	roleForLevel(level: number): string
	{
		let role = ROLES[0]?.name ?? "";

		for (const candidate of ROLES)
		{
			if (candidate.level <= level) role = candidate.name;
		}

		return role;
	}
}
