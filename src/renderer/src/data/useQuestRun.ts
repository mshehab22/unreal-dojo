// Runs one quest Run or Submit: makes the run id, follows its progress events, keeps the answer, and can cancel it.
import { useCallback, useState } from "react";

import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent, RunRequest } from "@shared/types/run";

import { dojo } from "./activeClient";
import type { DojoClient } from "./DojoClient";
import { queryCache } from "./QueryCache";
import type { QueryKey } from "./queryKeys";
import { toAppError } from "./toAppError";
import { useBuildProgress } from "./useBuildProgress";

/** Where a run stands. */
export type QuestRunStatus = "idle" | "running" | "finished" | "cancelled" | "errored";

/** A run's state and controls. */
export interface QuestRun<Value>
{
	status: QuestRunStatus;
	progress: BuildProgressEvent | null;
	value: Value | null;
	error: AppError | null;
	start: (questId: string, files: Record<string, string>) => Promise<Value | undefined>;
	cancel: () => void;
}

/** Wraps `operation(client, request)` (runQuest or submitQuest) as a startable, cancellable run that refreshes `invalidates` when it ends. */
export function useQuestRun<Value>(operation: (client: DojoClient, request: RunRequest) => Promise<Value>, invalidates: readonly QueryKey[] = []): QuestRun<Value>
{
	const [runId, setRunId] = useState<string | null>(null);
	const [status, setStatus] = useState<QuestRunStatus>("idle");
	const [value, setValue] = useState<Value | null>(null);
	const [error, setError] = useState<AppError | null>(null);
	const progress = useBuildProgress(runId);

	const start = useCallback(async (questId: string, files: Record<string, string>): Promise<Value | undefined> =>
	{
		const nextRunId = crypto.randomUUID();

		setRunId(nextRunId);
		setStatus("running");
		setError(null);

		try
		{
			const answer = await operation(dojo(), { runId: nextRunId, questId, files });

			setValue(answer);
			setStatus("finished");
			void queryCache.invalidate(invalidates);
			return answer;
		}
		catch (thrown)
		{
			const appError = toAppError(thrown);

			setError(appError);
			setStatus(appError.code === "run-cancelled" ? "cancelled" : "errored");
			return undefined;
		}
		// The operation and keys are fixed for the component's life.
	}, []);

	const cancel = useCallback(() =>
	{
		if (runId) void dojo().cancelRun(runId);
	}, [runId]);

	return { status, progress, value, error, start, cancel };
}
