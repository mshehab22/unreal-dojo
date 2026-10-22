// Tracks running operations by the renderer's run id so `cancelRun` can stop them, and so quitting stops them all.
import type { BuildProgressEvent, RunAnswer, RunStatus } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";

/** How many finished runs are remembered for `status`, newest kept. */
const REMEMBERED_FINISHED_RUNS = 20;

/** One abort controller per running operation. */
export class RunRegistry
{
	private readonly controllers = new Map<string, AbortController>();
	private readonly lastEvents = new Map<string, BuildProgressEvent>();
	private readonly finished = new Map<string, RunAnswer>();
	private settleWaiters: (() => void)[] = [];

	/** Remembers the latest progress event of a running operation, for `status`. */
	recordProgress(event: BuildProgressEvent): void
	{
		if (this.controllers.has(event.runId)) this.lastEvents.set(event.runId, event);
	}

	/** Remembers how a run ended, so a window that missed the answer can still read it (A820). Only the newest few are kept. */
	recordAnswer(runId: string, answer: RunAnswer): void
	{
		this.finished.delete(runId);
		this.finished.set(runId, answer);

		for (const oldest of this.finished.keys())
		{
			if (this.finished.size <= REMEMBERED_FINISHED_RUNS) break;

			this.finished.delete(oldest);
			this.lastEvents.delete(oldest);
		}
	}

	/** Where a run stands: running with its last event, finished with its answer, or unknown. */
	status(runId: string): RunStatus
	{
		const lastEvent = this.lastEvents.get(runId) ?? null;
		const answer = this.finished.get(runId);

		if (this.controllers.has(runId)) return { runId, state: "running", lastEvent, answer: null };
		if (answer) return { runId, state: "finished", lastEvent, answer };

		return { runId, state: "unknown", lastEvent: null, answer: null };
	}

	/** Registers a run and returns its cancel signal. Throws `run-already-exists` for a run id in use. */
	begin(runId: string): AbortSignal
	{
		if (this.controllers.has(runId)) throw new AppErrorException("run-already-exists", "That run is already going.", "Wait for it to finish or cancel it first.", runId);

		const controller = new AbortController();
		this.controllers.set(runId, controller);

		return controller.signal;
	}

	/** Forgets a finished run, and wakes `cancelAll` once nothing is left. */
	end(runId: string): void
	{
		this.controllers.delete(runId);

		if (this.controllers.size > 0) return;

		const waiters = this.settleWaiters;
		this.settleWaiters = [];
		for (const wake of waiters) wake();
	}

	/** True while any run is going. */
	hasRuns(): boolean
	{
		return this.controllers.size > 0;
	}

	/** Cancels a running operation. Throws `run-not-found` when nothing with that id is running. */
	cancel(runId: string): void
	{
		const controller = this.controllers.get(runId);
		if (!controller) throw new AppErrorException("run-not-found", "There is no running build or test with that id.", "It may have finished already.", runId);

		controller.abort();
	}

	/** Cancels every run (their process trees are killed) and resolves once all have ended, or after `waitMs` at most. Used when the app quits, so no UBT or editor is left holding UBT's mutex. */
	cancelAll(waitMs: number): Promise<void>
	{
		for (const controller of this.controllers.values()) controller.abort();

		if (this.controllers.size === 0) return Promise.resolve();

		return new Promise((resolve) =>
		{
			const timer = setTimeout(resolve, waitMs);

			this.settleWaiters.push(() =>
			{
				clearTimeout(timer);
				resolve();
			});
		});
	}
}
