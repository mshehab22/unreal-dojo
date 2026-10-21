// Runs one sandbox create or rebuild: makes the run id, follows its progress, keeps the result, and can cancel it.
import { useCallback, useState } from "react";

import type { SandboxSetupResult } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent } from "@shared/types/run";

import { dojo } from "./activeClient";
import type { DojoClient } from "./DojoClient";
import { queryCache } from "./QueryCache";
import { QUERY_KEYS } from "./queryKeys";
import { toAppError } from "./toAppError";
import { useBuildProgress } from "./useBuildProgress";

/** Where a sandbox build stands. */
export type SandboxBuildStatus = "idle" | "running" | "succeeded" | "failed" | "cancelled" | "errored";

/** The build's state and controls. */
export interface SandboxBuild
{
	status: SandboxBuildStatus;
	progress: BuildProgressEvent | null;
	result: SandboxSetupResult | null;
	error: AppError | null;
	start: () => void;
	cancel: () => void;
}

/** Wraps `operation(client, runId)` (createSandbox or rebuildSandbox) as a startable, cancellable build. */
export function useSandboxBuild(operation: (client: DojoClient, runId: string) => Promise<SandboxSetupResult>): SandboxBuild
{
	const [runId, setRunId] = useState<string | null>(null);
	const [status, setStatus] = useState<SandboxBuildStatus>("idle");
	const [result, setResult] = useState<SandboxSetupResult | null>(null);
	const [error, setError] = useState<AppError | null>(null);
	const progress = useBuildProgress(runId);

	const start = useCallback(() =>
	{
		const nextRunId = crypto.randomUUID();

		setRunId(nextRunId);
		setStatus("running");
		setResult(null);
		setError(null);

		operation(dojo(), nextRunId).then(
			(answer) =>
			{
				setResult(answer);
				setStatus(answer.ok ? "succeeded" : "failed");
				void queryCache.invalidate([QUERY_KEYS.settings, QUERY_KEYS.environment]);
			},
			(thrown: unknown) =>
			{
				const appError = toAppError(thrown);

				setError(appError);
				setStatus(appError.code === "run-cancelled" ? "cancelled" : "errored");
			},
		);
		// The operation is fixed for the component's life.
	}, []);

	const cancel = useCallback(() =>
	{
		if (runId) void dojo().cancelRun(runId);
	}, [runId]);

	return { status, progress, result, error, start, cancel };
}
