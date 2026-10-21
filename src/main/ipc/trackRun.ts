// Runs a long operation under the renderer's run id: registers it for cancel, stamps its progress events, and turns a cancel into `run-cancelled`.
import type { BuildProgressEvent } from "@shared/types/run";

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
		const value = await operation((update) => sendProgress({ ...update, runId, elapsedMs: Date.now() - startedAt }), signal);

		if (signal.aborted) throw runCancelled();

		return value;
	}
	finally
	{
		registry.end(runId);
	}
}
