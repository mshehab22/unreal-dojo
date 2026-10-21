// Loads the learner's saved board for a breakdown (or a boss's breakdown), then opens the workspace with it.
import type { BreakdownQuest, BossQuest } from "@shared/types/content";

import { LoadingBlock } from "@/components/LoadingBlock";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

import { emptyPlan } from "./boardModel";
import { BreakdownWorkspace } from "./BreakdownWorkspace";

/** Props for BreakdownQuestView. */
interface BreakdownQuestViewProps
{
	readonly quest: BreakdownQuest | BossQuest;
}

/** Waits for progress once, so the board starts from the saved plan rather than flashing empty. */
export function BreakdownQuestView({ quest }: BreakdownQuestViewProps)
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());

	if (!progress.data) return <LoadingBlock height="h-96" />;

	return <BreakdownWorkspace quest={quest} initialPlan={progress.data.quests[quest.id]?.breakdownPlan ?? emptyPlan()} />;
}
