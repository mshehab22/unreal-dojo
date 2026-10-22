// Runs a long operation under the renderer's run id: registers it for cancel, stamps its progress events, turns a cancel into `run-cancelled`,
// and remembers the last event and the answer for `getRunStatus` (A820).
import type { BuildProgressEvent } from "@shared/types/run";

import { runCancelled } from "../services/unreal/sandboxErrors";
import type { ProgressListener } from "../services/unreal/ProgressUpdate";
import type { RunRegistry } from "../services/unreal/RunRegistry";
import { toAppError } from "./registerHandlers";

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
		registry.recordAnswer(runId, { ok: false, error: toAppError(`run ${runId}`, thrown) });

		throw thrown;
	}
	finally
	{
		registry.end(runId);
	}
}
