// The last Submit's result for the run column: from the loot screen's hand-off when there is one, else from the quest's latest stored attempt, so it survives a reload or a restart (A814).
import type { PlayerProgress } from "@shared/types/progress";
import type { RunResult } from "@shared/types/run";

import type { LootEntry } from "../loot/useLootStore";

/** The run of the quest's latest Submit, or null when it has none stored. The loot store wins because it may hold a Submit the save has not been reread for yet. */
export function lastSubmitResult(questId: string, lootEntry: LootEntry | null, progress: PlayerProgress): RunResult | null
{
	if (lootEntry?.quest.id === questId && lootEntry.detail.kind === "build") return lootEntry.detail.run;

	const stored = progress.attempts.filter((attempt) => attempt.questId === questId && attempt.run !== undefined);

	return stored[stored.length - 1]?.run ?? null;
}
