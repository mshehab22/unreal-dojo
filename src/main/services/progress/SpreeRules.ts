// Sharpshooter spree: consecutive first-try Submit passes on build and refactor quests, with armor.
import type { PlayerProgress } from "@shared/types/progress";

import { MAX_ARMOR, SPREE_BONUS } from "./rules";

/** What one Submit means for the spree. */
export interface SpreeSubmit
{
	/** True for build and refactor quests (other kinds and Run never count). */
	countsForSpree: boolean;

	/** True when this is the quest's first Submit and the quest was never passed before. */
	firstSubmit: boolean;

	/** True when the Submit passed. */
	passed: boolean;
}

/** Spree rules. Pure: returns a new spree. */
export class SpreeRules
{
	/** Applies one Submit. A first-try pass adds 1; a first-try miss resets to 0 unless armor absorbs it; later submits change nothing. Best is never lost. */
	applySubmit(spree: PlayerProgress["spree"], submit: SpreeSubmit): { spree: PlayerProgress["spree"]; armorUsed: boolean }
	{
		if (!submit.countsForSpree || !submit.firstSubmit) return { spree: { ...spree }, armorUsed: false };

		if (submit.passed)
		{
			const current = spree.current + 1;

			return { spree: { current, best: Math.max(spree.best, current), armor: spree.armor }, armorUsed: false };
		}

		if (spree.armor > 0) return { spree: { ...spree, armor: spree.armor - 1 }, armorUsed: true };

		return { spree: { ...spree, current: 0 }, armorUsed: false };
	}

	/** True when the spree bonus applies to a pass that leaves the spree at this length. */
	bonusApplies(spreeAfter: number): boolean
	{
		return spreeAfter >= SPREE_BONUS.threshold;
	}

	/** Adds one armor (from a boss or a chest), capped at two. */
	earnArmor(spree: PlayerProgress["spree"]): PlayerProgress["spree"]
	{
		return { ...spree, armor: Math.min(MAX_ARMOR, spree.armor + 1) };
	}
}
