// Maps the content catalog's pack outlines into the narrow quest facts the rules read.
import type { PackOutline } from "@shared/types/catalog";

import type { RuleQuest } from "./RuleQuest";

/** Turns every quest of every pack into a RuleQuest, in map order (pack, world, quest). */
export function toRuleQuests(packs: PackOutline[]): RuleQuest[]
{
	return packs.flatMap((pack) =>
		pack.worlds.flatMap((world) =>
			world.quests.map((quest) =>
			{
				const ruleQuest: RuleQuest = {
					id: quest.id,
					title: quest.title,
					kind: quest.kind,
					difficulty: quest.difficulty,
					xp: quest.xp,
					packId: pack.id,
					packOrder: pack.order,
					worldId: world.id,
					worldOrder: world.order,
					order: quest.order,
					prerequisites: [...quest.prerequisites],
					terms: [...quest.terms],
					patterns: [...quest.patterns],
					skills: [...quest.skills],
					// Content has no field saying whether a quest adds a class, so no quest counts as a short build yet (A132, A311).
					addsNewClass: true,
				};

				if (quest.scaffold) ruleQuest.scaffold = quest.scaffold;

				return ruleQuest;
			}),
		),
	);
}
