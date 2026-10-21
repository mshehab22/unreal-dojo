// Shapes loaded content into what the renderer receives: outlines for the World Map and full quests without hint texts.
import type { LearnerQuest, LearnerWorld, PackOutline, QuestOutline } from "@shared/types/catalog";
import type { AuthoredQuest, Pack, World } from "@shared/types/content";

/** Copies a quest's front matter (and scaffold level for build and refactor quests) for the World Map. */
export function toQuestOutline(quest: AuthoredQuest): QuestOutline
{
	const outline: QuestOutline = {
		id: quest.id,
		title: quest.title,
		order: quest.order,
		kind: quest.kind,
		difficulty: quest.difficulty,
		patterns: quest.patterns,
		skills: quest.skills,
		terms: quest.terms,
		prerequisites: quest.prerequisites,
		xp: quest.xp,
		estimatedMinutes: quest.estimatedMinutes,
		concepts: quest.concepts,
	};

	if (quest.kind === "build" || quest.kind === "refactor") outline.scaffold = quest.scaffold;

	return outline;
}

/** Returns every pack as an outline: worlds in order, each with quest outlines in order. */
export function toPackOutlines(packs: readonly Pack[]): PackOutline[]
{
	return packs.map((pack) => ({ ...pack, worlds: pack.worlds.map((world) => ({ ...world, quests: world.quests.map(toQuestOutline) })) }));
}

/** Returns a quest as a quest screen receives it: build and refactor quests carry `hintCount` instead of their hint texts. */
export function toLearnerQuest(quest: AuthoredQuest): LearnerQuest
{
	if (quest.kind !== "build" && quest.kind !== "refactor") return quest;

	const { hints, ...questWithoutHints } = quest;

	return { ...questWithoutHints, hintCount: hints.length };
}

/** Returns a world with its full quests, hint texts left out. */
export function toLearnerWorld(world: World): LearnerWorld
{
	return { ...world, quests: world.quests.map(toLearnerQuest) };
}
