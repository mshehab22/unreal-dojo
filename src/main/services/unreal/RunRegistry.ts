// Tracks running operations by the renderer's run id so `cancelRun` can stop them, and so quitting stops them all.
import type { BuildProgressEvent, RunAnswer, RunStatus } from "@shared/types/run";

import { AppErrorException } from "../../errors/AppErrorException";

/** How many finished runs are remembered for `status`, newest kept. */
const REMEMBERED_FINISHED_RUNS = 20;

/** Writes one diagnostic line (main's console in the app, nothing in tests). */
export type RunLog = (line: string) => void;

/** One abort controller per running operation, plus what `getRunStatus` reports about each run (A820). */
export class RunRegistry
{
	private readonly controllers = new Map<string, AbortController>();
	private readonly settling = new Set<string>();
	private readonly startedAt = new Map<string, number>();
	private readonly lastEvents = new Map<string, BuildProgressEvent>();
	private readonly eventCounts = new Map<string, number>();
	private readonly finished = new Map<string, RunAnswer>();
	private settleWaiters: (() => void)[] = [];

	constructor(private readonly log: RunLog = () => undefined)
	{
	}

	/** Remembers the latest progress event of a run that has not answered yet, and counts it, for `status`. */
	recordProgress(event: BuildProgressEvent): void
	{
		if (!this.isGoing(event.runId)) return;

		this.lastEvents.set(event.runId, event);
		this.eventCounts.set(event.runId, (this.eventCounts.get(event.runId) ?? 0) + 1);
	}

	/** Remembers how a run ended, so a window that missed the answer can still read it (A820), and logs it. Only the newest few are kept. */
	recordAnswer(runId: string, answer: RunAnswer): void
	{
		const elapsedMs = Date.now() - (this.startedAt.get(runId) ?? Date.now());

		this.log(`[run] ${runId} answered ok=${answer.ok}${answer.ok ? "" : ` code=${answer.error.code}`} after ${elapsedMs} ms`);
		this.settling.delete(runId);
		this.startedAt.delete(runId);
		this.finished.delete(runId);
		this.finished.set(runId, answer);

		for (const oldest of this.finished.keys())
		{
			if (this.finished.size <= REMEMBERED_FINISHED_RUNS) break;

			this.finished.delete(oldest);
			this.lastEvents.delete(oldest);
			this.eventCounts.delete(oldest);
		}
	}

	/** Where a run stands: running with its last event, finished with its answer, or unknown. A run that ended early (Submit while it records) still reads as running until its answer is recorded. */
	status(runId: string): RunStatus
	{
		const lastEvent = this.lastEvents.get(runId) ?? null;
		const eventCount = this.eventCounts.get(runId) ?? 0;
		const answer = this.finished.get(runId);

		if (this.isGoing(runId)) return { runId, state: "running", lastEvent, eventCount, answer: null };
		if (answer) return { runId, state: "finished", lastEvent, eventCount, answer };

		return { runId, state: "unknown", lastEvent: null, eventCount: 0, answer: null };
	}

	/** True while a run is registered or has ended without its answer recorded yet. */
	private isGoing(runId: string): boolean
	{
		return this.controllers.has(runId) || this.settling.has(runId);
	}

	/** Registers a run and returns its cancel signal. Throws `run-already-exists` for a run id in use. */
	begin(runId: string): AbortSignal
	{
		if (this.controllers.has(runId)) throw new AppErrorException("run-already-exists", "That run is already going.", "Wait for it to finish or cancel it first.", runId);

		const controller = new AbortController();
		this.controllers.set(runId, controller);
		this.startedAt.set(runId, Date.now());
		this.log(`[run] ${runId} started`);

		return controller.signal;
	}

	/** Forgets a run's cancel controller, and wakes `cancelAll` once nothing is left. Until its answer is recorded, `status` still says running. */
	end(runId: string): void
	{
		if (this.controllers.delete(runId) && !this.finished.has(runId)) this.settling.add(runId);

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
