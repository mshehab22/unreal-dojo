// Loads the save and the rules for a build or refactor quest, then opens the workspace with the learner's saved files.
import type { LearnerQuest } from "@shared/types/catalog";

import { AppErrorView } from "@/components/AppErrorView";
import { LoadingBlock } from "@/components/LoadingBlock";
import { QUERY_KEYS } from "@/data/queryKeys";
import { useDojoQuery } from "@/data/useDojoQuery";

import { BuildWorkspace } from "./BuildWorkspace";

/** Props for BuildQuestView. */
interface BuildQuestViewProps
{
	readonly quest: Extract<LearnerQuest, { kind: "build" | "refactor" }>;
}

/** Waits for progress and rules once, so the editor starts from the saved files. */
export function BuildQuestView({ quest }: BuildQuestViewProps)
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const failed = [progress, rules].find((query) => query.error && query.data === undefined);

	if (failed?.error) return <AppErrorView error={failed.error} onRetry={failed.reload} />;
	if (!progress.data || !rules.data) return <LoadingBlock height="h-96" />;

	return <BuildWorkspace quest={quest} initialProgress={progress.data} rules={rules.data} />;
}
