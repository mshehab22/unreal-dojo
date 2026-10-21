// Seer Stone: viewing a reference solution after two failed submits, paid with a stone or the quest's XP.
import { addDays } from "./calendarDays";
import { FAILED_SUBMITS_BEFORE_OFFERS, MAX_SEER_STONES, REMATCH_AFTER_DAYS } from "./rules";

/** What viewing a solution does. */
export interface SolutionView
{
	/** Seer Stones held after the view. */
	stonesAfter: number;

	/** True when a stone paid for the view (the quest keeps its XP). */
	stoneSpent: boolean;

	/** When the rematch is due (ISO 8601). */
	rematchDueAt: string;
}

/** Seer Stone rules. Pure: no I/O. */
export class SeerStoneRules
{
	/** The solution offer appears after two failed submits. */
	canOfferSolution(failedSubmits: number): boolean
	{
		return failedSubmits >= FAILED_SUBMITS_BEFORE_OFFERS;
	}

	/** Views the solution: spends a stone when asked and one is held, and always schedules a rematch 3 days out. */
	viewSolution(stonesHeld: number, spendStone: boolean, now: Date): SolutionView
	{
		const stoneSpent = spendStone && stonesHeld > 0;

		return {
			stonesAfter: stoneSpent ? stonesHeld - 1 : stonesHeld,
			stoneSpent,
			rematchDueAt: addDays(now, REMATCH_AFTER_DAYS).toISOString(),
		};
	}

	/** Adds one stone, capped at two. Returns the new count. */
	earnStone(stonesHeld: number): number
	{
		return Math.min(MAX_SEER_STONES, stonesHeld + 1);
	}
}
