// Follows one sandbox create or rebuild from the window: subscribes before it starts, keeps a ticking clock, and asks main how the run
// stands when progress goes quiet, so a lost event or a lost answer can never leave the screen frozen (A820, A822).
import type { DojoApi } from "@shared/ipc";
import type { SandboxSetupResult } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";
import type { BuildProgressEvent, RunAnswer } from "@shared/types/run";

import { toAppError } from "./toAppError";

/** Where a sandbox build stands. */
export type SandboxBuildStatus = "idle" | "running" | "succeeded" | "failed" | "cancelled" | "errored";

/** Everything the screen shows about the build. A new object on every change. */
export interface SandboxBuildSnapshot
{
	readonly status: SandboxBuildStatus;
	readonly progress: BuildProgressEvent | null;
	readonly result: SandboxSetupResult | null;
	readonly error: AppError | null;

	/** Time since the build started, ticking in the window even when no event arrives. */
	readonly elapsedMs: number;

	/** True while running when nothing has been heard from main for a while. */
	readonly isQuiet: boolean;

	/** Time since the last event or status answer. */
	readonly silentForMs: number;

	/** True while a status check is in flight. */
	readonly isChecking: boolean;
}

/** The time source, so tests move time by hand. */
export interface TrackerClock
{
	now(): number;

	/** Calls `callback` every `intervalMs`; returns the function that stops it. */
	every(callback: () => void, intervalMs: number): () => void;
}

/** The DojoApi methods the tracker uses. */
export type TrackerClient = Pick<DojoApi, "onBuildProgress" | "getRunStatus" | "cancelRun">;

/** Nothing heard for this long marks the build quiet and asks main how it stands. */
export const QUIET_AFTER_MS = 15_000;

/** While quiet, main is asked again this often. */
export const CHECK_AGAIN_AFTER_MS = 15_000;

/** How often the window's clock ticks. */
const TICK_MS = 1_000;

/** The real clock. */
export const SYSTEM_TRACKER_CLOCK: TrackerClock = {
	now: () => Date.now(),
	every: (callback, intervalMs) =>
	{
		const handle = setInterval(callback, intervalMs);

		return () => clearInterval(handle);
	},
};

/** The state before any build. */
const IDLE: SandboxBuildSnapshot = { status: "idle", progress: null, result: null, error: null, elapsedMs: 0, isQuiet: false, silentForMs: 0, isChecking: false };

/** The error shown when main no longer knows the run (the app restarted, or the run was forgotten). */
function lostRunError(runId: string): AppError
{
	return {
		code: "run-not-found",
		message: "Unreal Dojo lost track of this build.",
		suggestedAction: "Start it again. The sandbox is built from a clean copy each time, so nothing is left half done.",
		detail: runId,
	};
}

/** One tracked build at a time. Call `dispose` when the screen goes away. */
export class SandboxBuildTracker
{
	private snapshot: SandboxBuildSnapshot = IDLE;
	private runId: string | null = null;
	private startedAt = 0;
	private lastHeardAt = 0;
	private lastCheckedAt = 0;
	private settled = true;
	private stopListening: (() => void) | null = null;
	private stopTicking: (() => void) | null = null;

	constructor(
		private readonly client: TrackerClient,
		private readonly operation: (runId: string) => Promise<SandboxSetupResult>,
		private readonly onChange: (snapshot: SandboxBuildSnapshot) => void,
		private readonly clock: TrackerClock = SYSTEM_TRACKER_CLOCK,
		private readonly newRunId: () => string = () => crypto.randomUUID(),
	)
	{
	}

	/** The current state. */
	current(): SandboxBuildSnapshot
	{
		return this.snapshot;
	}

	/** Starts a build. The progress listener is attached before the call goes out, so no early event can be missed. */
	start(): void
	{
		this.releaseRun();

		const runId = this.newRunId();
		const now = this.clock.now();

		this.runId = runId;
		this.startedAt = now;
		this.lastHeardAt = now;
		this.lastCheckedAt = now;
		this.settled = false;
		this.stopListening = this.client.onBuildProgress((event) => this.receive(runId, event));
		this.stopTicking = this.clock.every(() => this.tick(runId), TICK_MS);
		this.update({ ...IDLE, status: "running" });

		let call: Promise<SandboxSetupResult>;

		try
		{
			call = this.operation(runId);
		}
		catch (thrown)
		{
			call = Promise.reject(thrown);
		}

		call.then(
			(value) => this.settle(runId, { ok: true, value }),
			(thrown: unknown) => this.settle(runId, { ok: false, error: toAppError(thrown) }),
		);
	}

	/** Asks main to stop the build; the answer (or a status check) reports the cancel. */
	cancel(): void
	{
		if (this.runId && !this.settled) void this.client.cancelRun(this.runId).catch(() => undefined);
	}

	/** Asks main right now how the build stands (the "Check status" button, and the quiet watchdog). */
	async checkStatus(): Promise<void>
	{
		const runId = this.runId;

		if (!runId || this.settled || this.snapshot.isChecking) return;

		this.lastCheckedAt = this.clock.now();
		this.update({ ...this.snapshot, isChecking: true });

		try
		{
			const status = await this.client.getRunStatus(runId);

			if (runId !== this.runId || this.settled) return;

			if (status.state === "finished" && status.answer)
			{
				this.settle(runId, status.answer, status.lastEvent);
				return;
			}

			if (status.state === "unknown")
			{
				this.settle(runId, { ok: false, error: lostRunError(runId) });
				return;
			}

			// Still running: main answered, so the build is alive. Take its latest event, which covers any the window missed.
			this.lastHeardAt = this.clock.now();
			this.update({ ...this.snapshot, progress: status.lastEvent ?? this.snapshot.progress, isChecking: false, isQuiet: false, silentForMs: 0 });
		}
		catch
		{
			// The check itself failed; stay quiet and try again on the next round.
			if (runId === this.runId && !this.settled) this.update({ ...this.snapshot, isChecking: false });
		}
	}

	/** Stops listening and ticking; a late answer is ignored. */
	dispose(): void
	{
		this.settled = true;
		this.releaseRun();
	}

	/** Takes a progress event for the current run. */
	private receive(runId: string, event: BuildProgressEvent): void
	{
		if (event.runId !== runId || runId !== this.runId || this.settled) return;

		this.lastHeardAt = this.clock.now();
		this.update({ ...this.snapshot, progress: event, isQuiet: false, silentForMs: 0, elapsedMs: this.elapsed(event) });
	}

	/** Advances the clock; when nothing was heard for a while, marks the build quiet and asks main. */
	private tick(runId: string): void
	{
		if (runId !== this.runId || this.settled) return;

		const now = this.clock.now();
		const silentForMs = now - this.lastHeardAt;
		const isQuiet = silentForMs >= QUIET_AFTER_MS;

		this.update({ ...this.snapshot, elapsedMs: this.elapsed(this.snapshot.progress), isQuiet, silentForMs });

		if (isQuiet && now - this.lastCheckedAt >= CHECK_AGAIN_AFTER_MS) void this.checkStatus();
	}

	/** Applies the run's answer once, from whichever arrives first: the call itself or a status check. */
	private settle(runId: string, answer: RunAnswer, lastEvent: BuildProgressEvent | null = null): void
	{
		if (runId !== this.runId || this.settled) return;

		this.settled = true;
		this.releaseRun();

		const progress = lastEvent ?? this.snapshot.progress;
		const base = { ...this.snapshot, progress, isQuiet: false, isChecking: false, silentForMs: 0, elapsedMs: this.elapsed(progress) };

		if (answer.ok)
		{
			// The value is the createSandbox or rebuildSandbox answer this tracker started.
			const result = answer.value as SandboxSetupResult;

			this.update({ ...base, status: result.ok ? "succeeded" : "failed", result, elapsedMs: result.durationMs || base.elapsedMs });
			return;
		}

		this.update({ ...base, status: answer.error.code === "run-cancelled" ? "cancelled" : "errored", error: answer.error });
	}

	/** Elapsed time: the window's own clock, or main's figure when that is further along. */
	private elapsed(event: BuildProgressEvent | null): number
	{
		return Math.max(this.clock.now() - this.startedAt, event?.elapsedMs ?? 0);
	}

	/** Detaches the listener and the clock of the current run. */
	private releaseRun(): void
	{
		this.stopListening?.();
		this.stopTicking?.();
		this.stopListening = null;
		this.stopTicking = null;
	}

	/** Stores and announces a new snapshot. */
	private update(snapshot: SandboxBuildSnapshot): void
	{
		this.snapshot = snapshot;
		this.onChange(snapshot);
	}
}
