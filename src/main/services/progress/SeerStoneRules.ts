// Seer Stone: viewing a reference solution after two failed submits, paid with a stone or the quest's XP.
import { addDays } from "./calendarDays";
import { FAILED_SUBMITS_BEFORE_OFFERS, MAX_SEER_STONES, REMATCH_AFTER_DAYS } from "./rules";

/** What viewing a solution does. */
export interface SolutionView
{
	/** Seer Stones held after the view. */
	stonesAfter: number;

	/** True when a stone paid for this view (the quest keeps its XP). */
	stoneSpent: boolean;

	/** When the rematch is due (ISO 8601), or null when this view schedules none (already viewed, or the quest was passed). */
	rematchDueAt: string | null;

	/** True when the solution was viewed before, so this view was free and changed nothing (A1391). */
	alreadyViewed: boolean;
}

/** Where the quest stands when the learner asks to view its solution. */
export interface SolutionViewRequest
{
	/** Seer Stones held now. */
	stonesHeld: number;

	/** True when the learner chose to spend a stone. */
	spendStone: boolean;

	/** True when the solution was viewed before. */
	alreadyViewed: boolean;

	/** True when the quest is passed already. */
	passed: boolean;

	/** The moment of the view. */
	now: Date;
}

/** Seer Stone rules. Pure: no I/O. */
export class SeerStoneRules
{
	/** The solution offer appears after two failed submits. */
	canOfferSolution(failedSubmits: number): boolean
	{
		return failedSubmits >= FAILED_SUBMITS_BEFORE_OFFERS;
	}

	/**
	 * Prices one view. A first view of an unpassed quest spends a stone when asked and one is held, and always schedules a rematch 3 days out.
	 * A repeat view, and any view of a passed quest, is free and schedules nothing, so viewing can never be used to buy a rematch's XP (A1391).
	 */
	viewSolution(request: SolutionViewRequest): SolutionView
	{
		if (request.alreadyViewed || request.passed) return { stonesAfter: request.stonesHeld, stoneSpent: false, rematchDueAt: null, alreadyViewed: request.alreadyViewed };

		const stoneSpent = request.spendStone && request.stonesHeld > 0;

		return {
			stonesAfter: stoneSpent ? request.stonesHeld - 1 : request.stonesHeld,
			stoneSpent,
			rematchDueAt: addDays(request.now, REMATCH_AFTER_DAYS).toISOString(),
			alreadyViewed: false,
		};
	}

	/** Adds one stone, capped at two. Returns the new count. */
	earnStone(stonesHeld: number): number
	{
		return Math.min(MAX_SEER_STONES, stonesHeld + 1);
	}
}
