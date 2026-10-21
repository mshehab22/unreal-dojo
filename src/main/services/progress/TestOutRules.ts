// Test-out: a world whose every term is at proficient lets the learner skip its worked and faded build quests. Bosses never skip.
import type { MasteryLevel } from "@shared/types/progress";

import { MasteryRules } from "./MasteryRules";
import type { RuleQuest } from "./RuleQuest";

/** Test-out rules. Pure: no I/O. */
export class TestOutRules
{
	/** Compares mastery levels. */
	private readonly mastery = new MasteryRules();

	/** True when there is at least one term and every one is at least proficient. */
	passes(termIds: string[], masteryOf: (itemId: string) => MasteryLevel | null | undefined): boolean
	{
		return termIds.length > 0 && termIds.every((term) => this.mastery.isAtLeast(masteryOf(term), "proficient"));
	}

	/** True for the quests a test-out lets the learner skip: worked and faded build quests. Bosses and everything else never skip. */
	isSkippable(quest: RuleQuest): boolean
	{
		return quest.kind === "build" && (quest.scaffold === "worked" || quest.scaffold === "faded");
	}
}
