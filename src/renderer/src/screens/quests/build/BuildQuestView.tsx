// Loads the save and the rules for a build or refactor quest, then opens the workspace with the learner's saved files.
import { useEffect, useRef, useState } from "react";

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

/** Waits for a fresh read of progress (not the cached one) and the rules, so the editor starts from the draft as it is saved now, and Submit sends what the learner last saved. */
export function BuildQuestView({ quest }: BuildQuestViewProps)
{
	const progress = useDojoQuery(QUERY_KEYS.progress, (client) => client.getProgress());
	const rules = useDojoQuery(QUERY_KEYS.rules, (client) => client.getRules());
	const failed = [progress, rules].find((query) => query.error && query.data === undefined);
	const sawFetch = useRef(false);
	const [fresh, setFresh] = useState(false);

	// Opening a quest refetches progress; the cached answer may be older than a draft saved since, so the workspace waits for the new one (once).
	if (progress.isLoading) sawFetch.current = true;

	useEffect(() =>
	{
		if (!fresh && sawFetch.current && !progress.isLoading && progress.data) setFresh(true);
	}, [fresh, progress.isLoading, progress.data]);

	if (failed?.error) return <AppErrorView error={failed.error} onRetry={failed.reload} />;
	if (!fresh || !progress.data || !rules.data) return <LoadingBlock height="h-96" />;

	return <BuildWorkspace quest={quest} initialProgress={progress.data} rules={rules.data} />;
}
