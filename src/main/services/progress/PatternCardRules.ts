// Pattern cards: unlocked on the first pass of a quest listing the pattern, upgraded by distinct use-case passes.
import type { PatternCardTier, PlayerProgress } from "@shared/types/progress";

import { CARD_TIER_THRESHOLDS } from "./rules";

/** One card that was unlocked or changed tier. */
export interface CardChange
{
	/** The pattern. */
	patternId: string;

	/** Tier before, or null when the card was just unlocked. */
	tierBefore: PatternCardTier | null;

	/** Tier after. */
	tierAfter: PatternCardTier;
}

/** Pattern card rules. Pure: returns new card maps instead of changing the old one. */
export class PatternCardRules
{
	/** The tier for this many distinct use-case passes: 1 bronze, 3 silver, 5 gold; null below 1. */
	tierFor(useCasesPassed: number): PatternCardTier | null
	{
		if (useCasesPassed >= CARD_TIER_THRESHOLDS.gold) return "gold";
		if (useCasesPassed >= CARD_TIER_THRESHOLDS.silver) return "silver";
		if (useCasesPassed >= CARD_TIER_THRESHOLDS.bronze) return "bronze";

		return null;
	}

	/** Records a passed quest against each pattern it lists. A quest counts once per pattern. Changes list only unlocks and upgrades. */
	applyPass(cards: PlayerProgress["patternCards"], questId: string, patternIds: string[]): { cards: PlayerProgress["patternCards"]; changes: CardChange[] }
	{
		const nextCards: PlayerProgress["patternCards"] = { ...cards };
		const changes: CardChange[] = [];

		for (const patternId of patternIds)
		{
			const existing = nextCards[patternId];
			const useCasesPassed = existing ? [...existing.useCasesPassed] : [];

			if (!useCasesPassed.includes(questId)) useCasesPassed.push(questId);

			const tierAfter = this.tierFor(useCasesPassed.length) ?? "bronze";
			const tierBefore = existing?.tier ?? null;

			nextCards[patternId] = { tier: tierAfter, useCasesPassed };

			if (tierBefore !== tierAfter) changes.push({ patternId, tierBefore, tierAfter });
		}

		return { cards: nextCards, changes };
	}
}
