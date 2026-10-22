// Picks where a loot screen's Next goes: the next quest in the same world that is open and not yet passed.
import type { QuestOutline } from "@shared/types/catalog";
import type { QuestAvailability } from "@shared/types/progress";

/** The first quest after `order` in the world that is available or in progress, or null when none is open (Next then goes back to the map). */
export function nextOpenQuest(worldQuests: readonly QuestOutline[], order: number, availability: Readonly<Record<string, QuestAvailability>>): QuestOutline | null
{
	const later = worldQuests.filter((quest) => quest.order > order).sort((first, second) => first.order - second.order);

	return later.find((quest) => availability[quest.id]?.status === "available" || availability[quest.id]?.status === "in_progress") ?? null;
}
