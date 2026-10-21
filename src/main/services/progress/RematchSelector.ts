// Rematch: a due pattern or term surfaces as a quest from a different world than the one it was earned in, when one exists.
import type { QuestAvailability } from "@shared/types/progress";

import type { RuleQuest } from "./RuleQuest";

/** Rematch world selection. Pure: no I/O. */
export class RematchSelector
{
	/**
	 * Picks the quest a due item surfaces as: a passed non-boss quest that uses the item (a rematch replays a quest),
	 * from a different world than `earnedInWorldId` when one exists, otherwise from the same world. Ties go to map order.
	 * Returns null when no passed quest uses the item.
	 */
	select(itemId: string, earnedInWorldId: string | undefined, quests: RuleQuest[], availability: Record<string, QuestAvailability>): string | null
	{
		const candidates = quests
			.filter((quest) => quest.kind !== "boss" && (quest.terms.includes(itemId) || quest.patterns.includes(itemId)))
			.filter((quest) => availability[quest.id]?.status === "passed")
			.sort((left, right) => left.packOrder - right.packOrder || left.worldOrder - right.worldOrder || left.order - right.order);

		const elsewhere = candidates.find((quest) => quest.worldId !== earnedInWorldId);

		return (elsewhere ?? candidates[0])?.id ?? null;
	}
}
