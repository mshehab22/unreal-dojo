// Skill points from passed quests and skill mastery from the skill's review items.
import type { MasteryLevel, PlayerProgress } from "@shared/types/progress";

import { MasteryRules } from "./MasteryRules";
import { BOSS_SKILL_MULTIPLIER } from "./rules";

/** One skill whose points or mastery changed. */
export interface SkillChange
{
	/** The skill. */
	skillId: string;

	/** Points gained by this change. */
	pointsGained: number;

	/** Mastery before, or null when the skill is new. */
	masteryBefore: MasteryLevel | null;

	/** Mastery after. */
	masteryAfter: MasteryLevel;
}

/** Skill rules. Pure: returns new skill maps instead of changing the old one. */
export class SkillRules
{
	/** Reads and compares mastery levels. */
	private readonly mastery = new MasteryRules();

	/** Points one pass gives each listed skill: the quest difficulty, doubled for a boss. */
	pointsFor(difficulty: number, isBoss: boolean): number
	{
		return isBoss ? difficulty * BOSS_SKILL_MULTIPLIER : difficulty;
	}

	/** Adds pass points to each skill. A new skill starts at attempted. */
	applyPass(skills: PlayerProgress["skills"], skillIds: string[], difficulty: number, isBoss: boolean): { skills: PlayerProgress["skills"]; changes: SkillChange[] }
	{
		const nextSkills: PlayerProgress["skills"] = { ...skills };
		const changes: SkillChange[] = [];
		const points = this.pointsFor(difficulty, isBoss);

		for (const skillId of skillIds)
		{
			const existing = nextSkills[skillId];
			const masteryAfter = existing?.mastery ?? "attempted";

			nextSkills[skillId] = { points: (existing?.points ?? 0) + points, mastery: masteryAfter };
			changes.push({ skillId, pointsGained: points, masteryBefore: existing?.mastery ?? null, masteryAfter });
		}

		return { skills: nextSkills, changes };
	}

	/** A skill's mastery follows its weakest review item, so one missed item shows the skill as due for review. */
	masteryFromItems(itemLevels: MasteryLevel[]): MasteryLevel
	{
		return this.mastery.lowest(itemLevels) ?? "attempted";
	}
}
