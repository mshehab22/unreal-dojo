// Test-out: a world whose every term is at proficient lets the learner skip its worked and faded build quests. Bosses never skip.
import type { MasteryLevel } from "@shared/types/progress";

import { MasteryRules } from "./MasteryRules";
import type { RuleQuest } from "./RuleQuest";

/** Test-out rules. Pure: no I/O. */
export class TestOutRules
{
	/** Compares mastery levels. */
	private readonly mastery = new MasteryRules();

	/** Worlds whose terms (the union of their quests' terms) are all at least proficient. A world with no terms never tests out. */
	testedOutWorlds(quests: RuleQuest[], masteryOf: (itemId: string) => MasteryLevel | null | undefined): string[]
	{
		const termsByWorld = new Map<string, Set<string>>();

		for (const quest of quests)
		{
			const terms = termsByWorld.get(quest.worldId) ?? new Set<string>();
			quest.terms.forEach((term) => terms.add(term));
			termsByWorld.set(quest.worldId, terms);
		}

		return [...termsByWorld.entries()]
			.filter(([, terms]) => terms.size > 0 && [...terms].every((term) => this.mastery.isAtLeast(masteryOf(term), "proficient")))
			.map(([worldId]) => worldId);
	}

	/** True for the quests a test-out lets the learner skip: worked and faded build quests. Bosses and everything else never skip. */
	isSkippable(quest: RuleQuest): boolean
	{
		return quest.kind === "build" && (quest.scaffold === "worked" || quest.scaffold === "faded");
	}
}
