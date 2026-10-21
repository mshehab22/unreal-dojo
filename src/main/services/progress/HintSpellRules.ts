// Hint spells: three per quest, revealed in order, each costing 15% of base XP on a pass.
import { HINT_COST_SHARE, HINTS_PER_QUEST } from "./rules";

/** Hint spell rules. Pure: no I/O. */
export class HintSpellRules
{
	/** XP one hint costs on a quest with this base XP. */
	costPerHint(baseXp: number): number
	{
		return Math.round(HINT_COST_SHARE * baseXp);
	}

	/** XP all revealed hints cost together. */
	totalCost(baseXp: number, hintsRevealed: number): number
	{
		return this.costPerHint(baseXp) * Math.min(hintsRevealed, HINTS_PER_QUEST);
	}

	/** Index of the next hint to reveal, or null when all three are out. */
	nextHintIndex(hintsRevealed: number, hintCount: number = HINTS_PER_QUEST): number | null
	{
		const available = Math.min(hintCount, HINTS_PER_QUEST);

		return hintsRevealed < available ? hintsRevealed : null;
	}
}
