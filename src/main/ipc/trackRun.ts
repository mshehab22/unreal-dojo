// Runs a long operation under the renderer's run id: registers it for cancel, stamps its progress events, turns a cancel into `run-cancelled`,
// and remembers the last event and the answer for `getRunStatus` (A820).
import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent } from "@shared/types/run";

import { AppErrorException } from "../errors/AppErrorException";
import { runCancelled } from "../services/unreal/sandboxErrors";
import type { ProgressListener } from "../services/unreal/ProgressUpdate";
import type { RunRegistry } from "../services/unreal/RunRegistry";

/** Starts `operation` with a progress listener and cancel signal, sends each update stamped with `runId` and elapsed time, and forgets the run when it ends. */
export async function trackRun<Value>(runId: string, registry: RunRegistry, sendProgress: (event: BuildProgressEvent) => void, operation: (onProgress: ProgressListener, signal: AbortSignal) => Promise<Value>): Promise<Value>
{
	const signal = registry.begin(runId);
	const startedAt = Date.now();

	try
	{
		const value = await operation((update) =>
		{
			const event = { ...update, runId, elapsedMs: Date.now() - startedAt };

			registry.recordProgress(event);
			sendProgress(event);
		}, signal);

		if (signal.aborted) throw runCancelled();

		registry.recordAnswer(runId, { ok: true, value });

		return value;
	}
	catch (thrown)
	{
		registry.recordAnswer(runId, { ok: false, error: rememberedError(thrown) });

		throw thrown;
	}
	finally
	{
		registry.end(runId);
	}
}

/** The AppError a failed run is remembered with; anything that is not one is remembered as `unexpected`, as the IPC wrapper reports it. */
function rememberedError(thrown: unknown): AppError
{
	if (thrown instanceof AppErrorException) return { ...thrown.appError };

	return {
		code: "unexpected",
		message: "Something went wrong in Unreal Dojo while doing that.",
		suggestedAction: "Try again. If it keeps happening, restart the app and report it with the details.",
		detail: thrown instanceof Error ? thrown.message : String(thrown),
	};
}
