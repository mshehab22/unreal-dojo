// Hands a graded attempt from a quest screen to the loot screen: the quest, the loot, and what the grader said.
import { create } from "zustand";

import type { LearnerQuest } from "@shared/types/catalog";
import type { AttemptOutcome, DrillItemResult } from "@shared/types/progress";
import type { BreakdownGrade, CodeReview } from "@shared/types/review";
import type { RunResult } from "@shared/types/run";

/** What the grader said, by quest kind. */
export type LootDetail =
	| { kind: "concept"; results: DrillItemResult[] }
	| { kind: "breakdown"; grade: BreakdownGrade }
	| { kind: "build"; run: RunResult; review?: CodeReview; files: Record<string, string> };

/** One attempt's loot, as the loot screen shows it. */
export interface LootEntry
{
	quest: LearnerQuest;
	outcome: AttemptOutcome;
	detail: LootDetail;
}

/** The loot store: the latest attempt, and a way to replace its review after Retry review. */
interface LootState
{
	readonly entry: LootEntry | null;
	show: (entry: LootEntry) => void;
}

/** The latest attempt's loot. Quest screens set it, then navigate to `#/loot?quest=<id>`. */
export const useLootStore = create<LootState>((set) => ({
	entry: null,
	show: (entry) => set({ entry }),
}));
