// Level, role, and progress to the next level, computed from total XP and the rule constants that came through IPC.
import type { RulesSnapshot } from "@shared/types/progress";

/** Where the learner stands on the level curve. */
export interface LevelStanding
{
	level: number;
	role: string;
	xpIntoLevel: number;
	xpForNextLevel: number;
	nextRole: { name: string; level: number } | null;
}

/** XP needed to go from `level` to the next, using the curve from `getRules`. */
export function xpToNextLevel(level: number, rules: Pick<RulesSnapshot, "levelCurveBase" | "levelCurveGrowth">): number
{
	return Math.round(rules.levelCurveBase * Math.pow(rules.levelCurveGrowth, level - 1));
}

/** Level, role, and progress toward the next level for this much total XP. */
export function levelStanding(totalXp: number, rules: Pick<RulesSnapshot, "levelCurveBase" | "levelCurveGrowth" | "roles">): LevelStanding
{
	let level = 1;
	let remaining = Math.max(0, totalXp);

	while (remaining >= xpToNextLevel(level, rules))
	{
		remaining -= xpToNextLevel(level, rules);
		level += 1;
	}

	const held = rules.roles.filter((role) => role.level <= level);
	const next = rules.roles.find((role) => role.level > level) ?? null;

	return {
		level,
		role: held[held.length - 1]?.name ?? "",
		xpIntoLevel: remaining,
		xpForNextLevel: xpToNextLevel(level, rules),
		nextRole: next ? { name: next.name, level: next.level } : null,
	};
}
