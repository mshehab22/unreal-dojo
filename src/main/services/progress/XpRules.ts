// Itemized XP for one attempt: difficulty band, first pass, repeats, rematches, hints, effort, spree, potion.
import type { XpBandRule, XpBreakdown } from "@shared/types/progress";

import {
	DIFFICULTY_RANGE,
	DRILL_XP,
	EFFORT_QUEST_KINDS,
	EFFORT_SHARE,
	LEVELS_PER_BAND,
	REMATCH_SHARE,
	SPREE_BONUS,
	XP_BANDS,
	XP_POTION,
} from "./rules";
import type { QuestKind } from "./contentFacts";
import { HintSpellRules } from "./HintSpellRules";

/** How an attempt ended, as far as XP cares. */
export type AttemptResultKind = "passed" | "failed-compiled" | "failed";

/** Everything XpRules needs to price one attempt. */
export interface QuestXpInput
{
	/** The quest's base XP. */
	baseXp: number;

	/** Quest difficulty from 1 to 5. */
	difficulty: number;

	/** The learner's level before the attempt. */
	level: number;

	/** The quest kind (effort XP is paid only for build, refactor, and boss). */
	kind: QuestKind;

	/** How the attempt ended. */
	result: AttemptResultKind;

	/** True when the quest was passed before (a repeat pays 0). */
	previouslyPassed: boolean;

	/** True when this attempt is a scheduled rematch (pays 50%). */
	isRematch: boolean;

	/** Hint spells revealed on the quest. */
	hintsRevealed: number;

	/** True when the solution was viewed without spending a Seer Stone (the quest pays 0 outside a rematch). */
	solutionViewedWithoutStone: boolean;

	/** True when the 5% effort XP was already paid for this quest. */
	effortAlreadyGranted: boolean;

	/** Spree length after this attempt (the bonus applies at 5 or more). */
	spreeAfter: number;

	/** True while an XP potion is active. */
	potionActive: boolean;
}

/** XP rules from the spec's table. Pure: no I/O. */
export class XpRules
{
	/** Prices hint spells. */
	private readonly hintSpells = new HintSpellRules();

	/** The learner's band: floor(level / 4) + 1, clamped to 1..5. */
	learnerBand(level: number): number
	{
		const band = Math.floor(level / LEVELS_PER_BAND) + 1;

		return Math.min(DIFFICULTY_RANGE.max, Math.max(DIFFICULTY_RANGE.min, band));
	}

	/** Where a quest's difficulty sits compared to the learner's band. */
	band(difficulty: number, level: number): XpBandRule["band"]
	{
		const gap = difficulty - this.learnerBand(level);

		if (gap >= 2) return "far-above";
		if (gap === 1) return "above";
		if (gap === 0) return "at-level";
		if (gap === -1) return "below";

		return "far-below";
	}

	/** The multiplier on base XP for a quest of this difficulty at this level. */
	multiplier(difficulty: number, level: number): number
	{
		const band = this.band(difficulty, level);

		return XP_BANDS.find((rule) => rule.band === band)?.multiplier ?? 1;
	}

	/** Prices one quest attempt. Total never goes below 0 (hints can only eat what the pass earned). */
	questXp(input: QuestXpInput): XpBreakdown
	{
		const difficultyMultiplier = this.multiplier(input.difficulty, input.level);
		const breakdown: XpBreakdown = { base: input.baseXp, difficultyMultiplier, firstPass: 0, spreeBonus: 0, hintCost: 0, effort: 0, potionBonus: 0, total: 0 };

		if (input.result === "passed")
		{
			breakdown.firstPass = this.passXp(input, difficultyMultiplier);
			breakdown.hintCost = breakdown.firstPass > 0 ? -Math.min(breakdown.firstPass, this.hintSpells.totalCost(input.baseXp, input.hintsRevealed)) : 0;

			const earned = breakdown.firstPass + breakdown.hintCost;
			breakdown.spreeBonus = earned > 0 && input.spreeAfter >= SPREE_BONUS.threshold ? Math.round(SPREE_BONUS.share * earned) : 0;
		}
		else if (input.result === "failed-compiled" && EFFORT_QUEST_KINDS.includes(input.kind) && !input.effortAlreadyGranted && !input.previouslyPassed)
		{
			breakdown.effort = Math.round(EFFORT_SHARE * input.baseXp);
		}

		const beforePotion = breakdown.firstPass + breakdown.hintCost + breakdown.spreeBonus + breakdown.effort;
		breakdown.potionBonus = input.potionActive ? Math.round(XP_POTION.share * beforePotion) : 0;
		breakdown.total = beforePotion + breakdown.potionBonus;

		return breakdown;
	}

	/** XP for one completed drill: flat 10, plus the potion bonus while one is active. */
	drillXp(potionActive: boolean): number
	{
		return potionActive ? Math.round(DRILL_XP * (1 + XP_POTION.share)) : DRILL_XP;
	}

	/**
	 * First-pass XP after the multiplier: the full amount on a first pass with no unpaid solution view (a Seer Stone view keeps it, even after the
	 * rematch date, A1391), else 50% on a rematch, else 0 (a repeat, or a pass before the rematch after a view paid with XP).
	 */
	private passXp(input: QuestXpInput, difficultyMultiplier: number): number
	{
		const full = Math.round(input.baseXp * difficultyMultiplier);

		if (!input.previouslyPassed && !input.solutionViewedWithoutStone) return full;
		if (input.isRematch) return Math.round(REMATCH_SHARE * full);

		return 0;
	}
}
