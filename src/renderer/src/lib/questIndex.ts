// Finds a quest outline, its world, and its pack by quest id across the packs from `listPacks`.
import type { PackOutline, QuestOutline, WorldOutline } from "@shared/types/catalog";

/** A quest outline with where it lives. */
export interface QuestLocation
{
	quest: QuestOutline;
	world: WorldOutline;
	pack: PackOutline;
}

/** Maps every quest id to its outline, world, and pack. */
export function indexQuests(packs: readonly PackOutline[]): Map<string, QuestLocation>
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
