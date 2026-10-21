// Finds a quest, its world, and its pack by quest id across the loaded packs.
import type { AuthoredQuest, Pack, World } from "@shared/types/content";

/** A quest with where it lives. */
export interface QuestLocation
{
	quest: AuthoredQuest;
	world: World;
	pack: Pack;
}

/** Maps every quest id to its quest, world, and pack. */
export function indexQuests(packs: readonly Pack[]): Map<string, QuestLocation>
{
	const index = new Map<string, QuestLocation>();

	for (const pack of packs)
	{
		for (const world of pack.worlds)
		{
			for (const quest of world.quests) index.set(quest.id, { quest, world, pack });
		}
	}

	return index;
}
